# Slack Signup Approval — Design

Date: 2026-07-07

## Problem

Today a self-registration raises a Slack "🔐 Access Request" alert; an admin then
approves the user out-of-band (CLI `alexandria users approve`, or the Cognito console).
We want the admin to **approve or reject directly from Slack** via buttons on that alert.

## Solution overview

The `platform/alerter` pipeline already provides the entire Slack-side machinery:

- `notifier` renders action buttons when a `notifications.Message` carries an
  `Interactive` block, embedding `source`/`callbackId`/`payload` in each button value.
- `responder` receives the click over its Function URL, verifies the Slack signature,
  enforces an operator allow-list (SSM), strips the buttons and posts "…by @user",
  then republishes the decision to the **`alerting-responses`** SNS topic with a
  `source` message attribute for filtering.

Alexandria only implements the two ends: **(a)** attach buttons to the existing signup
alert, and **(b)** a new consumer that applies the decision. No platform change.

## Naming changes

- **Rename** the existing Cognito-trigger lambda `user-management` → **`user-onboarding`**
  (Terraform `alexandria-user-onboarding`). Its responsibility is onboarding new signups
  (default approval state + raising the Access Request), which "user-management" described
  too vaguely. This aligns with the existing notification `source` (`alexandria-onboard-users`)
  and mirrors the meal-planner rename.
- **New** consumer lambda **`user-approval`** (Terraform `alexandria-user-approval`).
- The CLI approval path (`alexandria users approve`) is **unchanged** and remains available.

## Data flow

```
signup (Cognito pre_sign_up)
  └─ user-onboarding Lambda ── notifications.Message + Interactive ──▶ SNS alerting-events
                                                                          │
                                          platform notifier ─────────────┘  (renders buttons)
                                                 ▼
                                              Slack  ── admin clicks Approve/Reject ──▶ platform responder
                                                 (verifies sig + operator allow-list,          │
                                                  strips buttons, posts "…by @user")           │
                                                                                               ▼
                                        SNS alerting-responses (attr source=alexandria-onboard-users)
                                                                                               │
                                        NEW user-approval Lambda ◀─────────────────────────────┘  (filter_policy on source)
                                             ├─ approve → Cognito AdminUpdateUserAttributes custom:Approved=true
                                             ├─ reject  → (guard: already approved? skip+notify) AdminDeleteUser
                                             └─ on failure → publish alerting-events "⚠️ Failed to …"
```

## Component 1 — Producer change (`user-onboarding`)

In the `GetNotification` hook (`packages/functions/user-onboarding/cmd/main.go`), add an
`Interactive` block to the returned `notifications.Message`. The `content` (Access Request
Markdown) is unchanged:

- `CallbackID` = `event.Email` — human-readable label, echoed back for the failure alert.
- `Payload` = `event.UserName` — the Cognito username, exactly what `AdminDeleteUser` /
  `AdminUpdateUserAttributes` accept. Robust whether it is a native username or a federated
  `google_<sub>` (Alexandria supports Google OAuth).
- `Actions`:
  - `{ ID: "approve", Label: "Approve", Style: "primary" }`
  - `{ ID: "reject",  Label: "Reject",  Style: "danger" }`

**Dependency bump.** The `Interactive` type ships in `platform/notifications` **v1.2.0**;
Alexandria is on v1.1.0. Bump `github.com/Maev4l/platform/notifications v1.1.0 → v1.2.0`
in `packages/functions/go.mod` (additive — keeps existing producers' bytes unchanged).
`users-management` stays at v1.3.0 (its `GetNotification` hook signature and
`PreSignUpEvent{ Email, UserName }` fields are unchanged).

## Component 2 — New consumer lambda (`user-approval`)

A small self-contained Go Lambda, **SNS-triggered** (not API Gateway), in
`packages/functions/user-approval/cmd`, mirroring meal-planner's layout:
`main.go`, `decision.go`, `cognito.go`, `notifier.go`, `decision_test.go`. Deps
(aws-sdk-v2 cognito + sns, `platform/notifications`) already exist in
`packages/functions/go.mod` via `api`/`user-onboarding`.

**App filtering (two levels).** The SNS subscription carries
`filter_policy = { source = ["alexandria-onboard-users"] }` on the `source`
message attribute the responder sets, so AWS only delivers Alexandria's own signup
decisions (never another producer's). The handler also re-checks `decision.source`
in code (belt-and-suspenders against a misconfigured subscription) and ignores anything else.

Handler consumes `events.SNSEvent`; for each record it unmarshals the responder's
decision payload — the json tags ARE the wire contract with the responder:

```go
type decision struct {
    Source     string `json:"source"`     // "alexandria-onboard-users"
    CallbackID string `json:"callbackId"` // the user's email (human label)
    Action     string `json:"action"`     // "approve" | "reject"
    Payload    string `json:"payload"`    // the Cognito username
}
```

- `action == "approve"` → `AdminUpdateUserAttributes` set `custom:Approved="true"`
  (idempotent; a no-op on an already-approved user).
- `action == "reject"` → **guard first:** `AdminGetUser`; if the user is already
  approved (via CLI, a second admin, or a linked-existing account), **skip the delete**
  and post an "ℹ️ Reject Ignored" alert — deleting an active user would orphan their
  DynamoDB rows. Otherwise `AdminDeleteUser`; a `UserNotFoundException` (duplicate reject
  / SNS redelivery) is treated as success, keeping reject idempotent.
- unknown action → log and ignore.
- On any Cognito error → publish a fresh `alerting-events` Markdown alert
  (`⚠️ Signup Decision Failed` with the email fenced as inline code) via the shared
  `notifications.Message` contract (source `alexandria-user-approval`), and log. Success =
  log only (the responder already posted the "…by @user" confirmation).

**The handler always returns `nil`.** Failures are alerted + logged; returning an error
would make SNS retry and re-process (double-alert). Records are independent, so one bad
record never blocks others.

**Reject deletes only the Cognito user.** A fresh self-registrant has no DynamoDB records
yet (they own no libraries), so no table cleanup is required — keeping the consumer free of
any DynamoDB dependency.

Env vars: `REGION`, `USER_POOL_ID`, `SNS_TOPIC_ARN` (for failure alerts).

## Component 3 — Infrastructure

- **Bump all `terraform-modules` refs `v1.7.1` → `v1.8.1`** across `functions.tf`
  (`api`, `api_trigger`, `indexer`, `indexer_trigger`, `consistency_manager`,
  `consistency_manager_trigger`, `user_onboarding`, `user_onboarding_trigger`,
  `image_processor`, `image_processor_trigger`) so every module is on one version.
  The new `lambda-trigger-sns` module is pinned at `v1.8.1` too. The bump is safe:
  - v1.8.0 is purely additive over v1.7.1 (adds an optional `efs_config` variable,
    default `null`) — no breaking change.
  - v1.8.1 changes only `lambda-trigger-cognito` (`data.aws_region.current.id` →
    `.region`, an AWS-provider deprecation fix), which *benefits* `user_onboarding_trigger`.
- `sns.tf`: add `data "aws_sns_topic" "alerting_responses" { name = "alerting-responses" }`
  (the existing `data "aws_sns_topic" "alerting"` for `alerting-events` stays).
- `functions.tf`:
  - Rename `module "user_management"` → `module "user_onboarding"`; set
    `function_name = "alexandria-user-onboarding"`. Env vars (`REGION`, `SNS_TOPIC_ARN`)
    and permissions unchanged — the producer does not need `USER_POOL_ID` (the pool id
    lives on **user-approval**).
  - New `module "user_approval"` (`lambda-function`, arm64, 128MB), zip built from
    `../functions/user-approval/dist/user-approval.zip` with
    `hash = filebase64sha256("../functions/user-approval/bin/bootstrap")`,
    `additional_policy_arns = [aws_iam_policy.user_approval.arn]`, env:
    - `REGION`, `USER_POOL_ID = aws_cognito_user_pool.alexandria_user_pool.id`
    - `SNS_TOPIC_ARN = data.aws_sns_topic.alerting.arn` — the **`alerting-events`** topic
      (for publishing failure alerts). NOT `alerting-responses`; that topic is the trigger's
      *input* (below), whereas failure alerts are *output* onto the same events topic every
      other producer uses.
  - New `module "user_approval_trigger"` (`lambda-trigger-sns`) →
    `topic_arn = data.aws_sns_topic.alerting_responses.arn`,
    `filter_policy = jsonencode({ source = ["alexandria-onboard-users"] })`.
  - Rename `module "user_management_trigger"` → `module "user_onboarding_trigger"`.
  - Update `local.userManagementFilename` → `userOnboardingFilename`
    (`../functions/user-onboarding/dist/user-onboarding.zip`); add
    `userApprovalFilename` (`../functions/user-approval/dist/user-approval.zip`).
- `cognito.tf`: repoint `lambda_config` (`pre_sign_up` / `post_confirmation`) to
  `module.user_onboarding.function_arn`.
- `iam.tf`:
  - Rename policy: resource label `aws_iam_policy.user_management` →
    `aws_iam_policy.user_onboarding`, its `name` → `"alexandria-user-onboarding"`, and
    `data.aws_iam_policy_document.user_management` → `..._onboarding`
    (statements unchanged — keeps `sns:Publish` on `alerting-events` and the existing
    Cognito admin actions, incl. `AdminLinkProviderForUser` for account linking).
  - New policy `aws_iam_policy.user_approval` (`name = "alexandria-user-approval"`) +
    `data.aws_iam_policy_document.user_approval`:
    `cognito-idp:AdminUpdateUserAttributes` + `cognito-idp:AdminDeleteUser` +
    `cognito-idp:AdminGetUser` (scoped to the pool ARN, `AdminGetUser` for the reject
    guard) and `sns:Publish` (`alerting-events` topic, for failure alerts).

### Terraform resource-name alignment

Rename every Terraform identifier consistently — nothing keeps the `user_management` label:

| Kind | Old | New |
|------|-----|-----|
| lambda module | `module.user_management` | `module.user_onboarding` |
| cognito trigger module | `module.user_management_trigger` | `module.user_onboarding_trigger` |
| iam policy resource | `aws_iam_policy.user_management` | `aws_iam_policy.user_onboarding` |
| iam policy doc data | `data.aws_iam_policy_document.user_management` | `..._onboarding` |
| iam policy `name` attr | `alexandria-user-management` | `alexandria-user-onboarding` |
| local | `local.userManagementFilename` | `local.userOnboardingFilename` |

Because the Lambda `function_name` and IAM policy `name` change, Terraform will
**recreate** those resources (destroy + create) rather than update in place; the Cognito
trigger rewires to the new function ARN. Acceptable — the function is stateless.

New resources for user-approval: `module.user_approval`, `module.user_approval_trigger`,
`aws_iam_policy.user_approval`, `data.aws_iam_policy_document.user_approval`,
`data.aws_sns_topic.alerting_responses`.

## Rename mechanics — files to touch

Living code/config (rename `user-management` → `user-onboarding`):

- `packages/functions/user-management/` → `packages/functions/user-onboarding/` (dir).
- `packages/functions/Makefile`:
  - `build-user-management` / `package-user-management` targets → `-user-onboarding`,
    build path `./user-management/cmd` → `./user-onboarding/cmd`, zip `user-management.zip`
    → `user-onboarding.zip`, and the `clean` paths.
  - **Add** `build-user-approval` / `package-user-approval` targets (zip `user-approval.zip`)
    and wire them into the aggregate `build`, `package`, and `clean` targets, plus the
    `.PHONY` line.
- Root `Makefile`: verify no stale `user-management` reference (build/deploy delegate to
  `make package`; verify).
- `packages/functions/user-onboarding/cmd/main.go`: stale header comment
  ("Alexandria Cognito Lambda …") — keep accurate to the renamed function.

Living docs:

- `.claude/backend.md`: update the `user-management` mentions (backend section heading +
  Lambda description) to `user-onboarding`; document the new `user-approval` lambda + the
  Slack approve/reject flow.
- `.claude/authn-scheme.md`: in the Admin Approval Flow, add the Slack Approve/Reject
  button path alongside the existing CLI approval, and add `user-approval` to the
  architecture/triggers description.
- `.claude/CLAUDE.md` / memory index: only if they name the lambda (verify).

Historical, **do not rewrite** (point-in-time records): any `user-management` mentions in
`docs/superpowers/plans/*` and prior `docs/superpowers/specs/*` describe past state and
stay as-is.

## Assumptions / prerequisites

- The `platform/alerter` **responder** is deployed and wired into Slack:
  - Slack app **Interactivity → Request URL** = the responder's CloudFront custom domain
    **`https://platform-slack-responder.isnan.eu/`** (the `responder_public_url` output),
    NOT the raw `*.lambda-url…on.aws` Function URL.
  - The responder Function URL is **`AuthType = NONE`** (public), authenticated in-code by
    the Slack signing-secret HMAC + operator allow-list. It must NOT be `AWS_IAM` behind
    CloudFront OAC: OAC cannot SigV4-sign a POST *body* to a Lambda Function URL, so every
    Slack interactivity POST 403s with `InvalidSignatureException`.
  - SSM `slack.alerting.signing_secret` + `slack.alerting.operators` populated.
- The `alerting-responses` SNS topic exists (created by `alerter` infra).

## Known edge case (accepted)

For email/password signups the alert fires at `pre_sign_up`, while `custom:Approved="false"`
is written at `post_confirmation`. If an admin clicks Approve in the seconds between signup
and the user confirming, `post_confirmation` would overwrite the flag back to `false`.
Realistically the admin approves much later. Documented, not engineered around.

## Testing

- **user-approval** unit tests (fakes for Cognito + SNS, mirroring `api`'s `fakes_test.go`
  style): approve path, reject path (not-yet-approved → delete), reject-already-approved →
  skip delete + "Reject Ignored" alert, `UserNotFoundException` on reject treated as
  success, Cognito error → failure alert published with the email, unknown action ignored,
  wrong-source ignored.
- **user-onboarding**: assert `GetNotification` returns the expected `Interactive` block
  (two actions, `CallbackID`=email, `Payload`=username).

## Out of scope

- Rate limiting / audit log of decisions (the responder already records who acted in Slack
  + CloudWatch).
- Soft-reject (marking without deleting) — reject is a hard Cognito delete (guarded).
- Any change to the CLI approval path (remains available).
