# Slack Signup Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin approve or reject a new Alexandria signup directly from the Slack "Access Request" alert via buttons.

**Architecture:** Reuse the deployed `platform/alerter` pipeline (notifier renders buttons, responder verifies + republishes decisions to the `alerting-responses` SNS topic). Alexandria builds only the two ends: (a) the existing signup lambda (renamed `user-management` → `user-onboarding`) attaches an `Interactive` block to its alert; (b) a new SNS-triggered `user-approval` lambda applies the decision to Cognito.

**Tech Stack:** Go 1.25 (arm64 Lambda, `provided.al2023`), `platform/notifications` v1.2.0, `platform/users-management` v1.3.0, aws-sdk-go-v2 (cognitoidentityprovider, sns), Terraform, `terraform-modules` v1.8.1.

## Global Constraints

- **Single final commit only.** Do NOT commit per task. Stage/verify each task; the LAST step of the plan is one commit, made only on the user's explicit go.
- Go: fat-arrow n/a; use zerolog (`github.com/rs/zerolog/log`) for logging.
- Lambda: arm64, `runtime = "provided.al2023"`, handler `bootstrap`, memory 128MB.
- Notification `source` for the producer: **`alexandria-onboard-users`** (unchanged — must match the SNS filter policy and the consumer's in-code check).
- Consumer failure-alert `source`: **`alexandria-user-approval`**.
- App label in all Markdown alerts: **`Alexandria`**.
- Action IDs (contract between producer buttons and consumer switch): **`approve`**, **`reject`**.
- Cognito pool Terraform ref: `aws_cognito_user_pool.alexandria_user_pool`.
- All `terraform-modules` refs pinned to **`v1.8.1`**.
- Zip naming follows Alexandria convention (named zips, not `bootstrap.zip`): `user-onboarding.zip`, `user-approval.zip`; each zips a `bootstrap` binary.
- `SNS_TOPIC_ARN` env on both lambdas = the **`alerting-events`** topic (`data.aws_sns_topic.alerting.arn`) — used for publishing. The `alerting-responses` topic is only the consumer trigger's *input*.

---

### Task 1: Rename `user-management` → `user-onboarding`

Pure mechanical rename, no behavior change. Isolated so a reviewer can gate the rename before logic changes land.

**Files:**
- Move dir: `packages/functions/user-management/` → `packages/functions/user-onboarding/`
- Modify: `packages/functions/user-onboarding/cmd/main.go:1` (header comment)
- Modify: `packages/functions/Makefile` (targets + paths)

**Interfaces:**
- Produces: buildable target `build-user-onboarding` emitting `user-onboarding/bin/bootstrap`; package target `package-user-onboarding` emitting `user-onboarding/dist/user-onboarding.zip`.

- [ ] **Step 1: Move the directory (preserve git history)**

```bash
cd /Users/jrsue/dev/repos/alexandria
git mv packages/functions/user-management packages/functions/user-onboarding
```

- [ ] **Step 2: Update the header comment in main.go**

In `packages/functions/user-onboarding/cmd/main.go`, replace line 1:

```go
// Alexandria user-onboarding Cognito lambda — signup triggers (pre_sign_up,
// post_confirmation) using the shared platform users-management handler.
package main
```

- [ ] **Step 3: Rename the Makefile targets**

In `packages/functions/Makefile`:

Update the `.PHONY` line to drop `-user-management` and add `-user-onboarding` and `-user-approval` (the approval targets are added in Task 3; declare them now):

```makefile
.PHONY: build build-api build-indexer build-consistency-manager build-user-onboarding build-user-approval package package-api package-indexer package-user-onboarding package-user-approval clean lint format run-api-local
```

Replace the `build-user-management` target:

```makefile
build-user-onboarding:
	GOOS=$(GOOS) GOARCH=$(GOARCH) go build -ldflags="$(LDFLAGS)" -o user-onboarding/$(BIN_DIR)/bootstrap ./user-onboarding/cmd
```

Update the aggregate `build` target:

```makefile
build: build-api build-indexer build-consistency-manager build-user-onboarding
```

Replace the `package-user-management` target:

```makefile
package-user-onboarding: build-user-onboarding
	mkdir -p user-onboarding/$(PACKAGE_DIR)
	cd user-onboarding/$(BIN_DIR) && zip ../$(PACKAGE_DIR)/user-onboarding.zip bootstrap
```

Update the aggregate `package` target:

```makefile
package: package-api package-indexer package-consistency-manager package-user-onboarding
```

In the `clean` target, replace the two `user-management` lines:

```makefile
	rm -rf user-onboarding/$(BIN_DIR)
	rm -rf user-onboarding/$(PACKAGE_DIR)
```

- [ ] **Step 4: Verify the rename builds**

Run: `make -C packages/functions build-user-onboarding`
Expected: exits 0; `packages/functions/user-onboarding/bin/bootstrap` exists.

- [ ] **Step 5: Checkpoint (do NOT commit)**

Confirm `git status` shows the rename (`user-management/... -> user-onboarding/...`) and the Makefile edit. Leave staged; do not commit.

---

### Task 2: Producer — attach Approve/Reject buttons

Refactor the inline notification closure into a testable `signupNotification` function and add the `Interactive` block. Requires bumping `platform/notifications` to v1.2.0 (which introduces the `Interactive` type).

**Files:**
- Modify: `packages/functions/user-onboarding/cmd/main.go`
- Create: `packages/functions/user-onboarding/cmd/main_test.go`
- Modify: `packages/functions/go.mod`, `packages/functions/go.sum`

**Interfaces:**
- Produces: `func signupNotification(event *cognito.PreSignUpEvent) *cognito.NotificationPayload` — returns a `notifications.Message` (alias) with `Source="alexandria-onboard-users"`, unchanged Markdown `Content`, and an `Interactive` block (`CallbackID=event.Email`, `Payload=event.UserName`, actions `approve`/`reject`).

- [ ] **Step 1: Bump the notifications dependency**

Run:
```bash
cd /Users/jrsue/dev/repos/alexandria/packages/functions
go get github.com/Maev4l/platform/notifications@v1.2.0
go mod tidy
```
Expected: `go.mod` now shows `github.com/Maev4l/platform/notifications v1.2.0`.

- [ ] **Step 2: Write the failing test**

Create `packages/functions/user-onboarding/cmd/main_test.go`:

```go
package main

import (
	"strings"
	"testing"

	"github.com/Maev4l/platform/users-management/pkg/cognito"
)

func TestSignupNotification_HasApproveRejectButtons(t *testing.T) {
	msg := signupNotification(&cognito.PreSignUpEvent{Email: "a@b.c", UserName: "U9"})

	if msg.Source != "alexandria-onboard-users" {
		t.Fatalf("source = %q, want alexandria-onboard-users", msg.Source)
	}
	if !strings.Contains(msg.Content, "a@b.c") {
		t.Fatalf("content missing email: %q", msg.Content)
	}
	if msg.Interactive == nil {
		t.Fatal("expected Interactive block, got nil")
	}
	if msg.Interactive.CallbackID != "a@b.c" {
		t.Fatalf("callbackId = %q, want a@b.c", msg.Interactive.CallbackID)
	}
	if msg.Interactive.Payload != "U9" {
		t.Fatalf("payload = %q, want U9", msg.Interactive.Payload)
	}
	if len(msg.Interactive.Actions) != 2 {
		t.Fatalf("expected 2 actions, got %d", len(msg.Interactive.Actions))
	}
	if msg.Interactive.Actions[0].ID != "approve" || msg.Interactive.Actions[1].ID != "reject" {
		t.Fatalf("unexpected action ids: %+v", msg.Interactive.Actions)
	}
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd packages/functions && go test ./user-onboarding/... -run TestSignupNotification -v`
Expected: FAIL — `undefined: signupNotification`.

- [ ] **Step 4: Implement `signupNotification` and wire it in**

Rewrite `packages/functions/user-onboarding/cmd/main.go` to:

```go
// Alexandria user-onboarding Cognito lambda — signup triggers (pre_sign_up,
// post_confirmation) using the shared platform users-management handler.
package main

import (
	"context"
	"fmt"

	"github.com/Maev4l/platform/notifications"
	"github.com/Maev4l/platform/users-management/pkg/cognito"
	"github.com/aws/aws-lambda-go/lambda"
)

// signupNotification builds the Slack "Access Request" alert for a new signup,
// with Approve/Reject buttons. callbackId carries the email (human label echoed
// back for failure alerts); payload carries the Cognito username (what
// AdminUpdateUserAttributes / AdminDeleteUser need — robust for native and
// federated google_<sub> usernames). Action IDs are the contract the
// user-approval consumer switches on.
func signupNotification(event *cognito.PreSignUpEvent) *cognito.NotificationPayload {
	// cognito.NotificationPayload is an alias for notifications.Message; construct
	// via the alias so `go mod tidy` keeps notifications v1.2.0 (for Interactive).
	return &notifications.Message{
		Source: "alexandria-onboard-users",
		// Empty: the Markdown header already carries the app name, so a context
		// line would just duplicate it.
		SourceDescription: "",
		Target:            "slack",
		// Markdown: header + bullets. The email is fenced as inline code (may contain _).
		Content: fmt.Sprintf("# 🔐 Access Request\n\n- **User:** `%s`\n- **App:** Alexandria", event.Email),
		Format:  "markdown",
		Interactive: &notifications.Interactive{
			CallbackID: event.Email,
			Payload:    event.UserName,
			Actions: []notifications.Action{
				{ID: "approve", Label: "Approve", Style: "primary"},
				{ID: "reject", Label: "Reject", Style: "danger"},
			},
		},
	}
}

func main() {
	handler := cognito.NewHandler()

	handler.GetNotification = func(ctx context.Context, event *cognito.PreSignUpEvent, _ *cognito.AppConfig) (*cognito.NotificationPayload, bool) {
		return signupNotification(event), true
	}

	handler.GetCustomAttributes = func(ctx context.Context, event *cognito.PostConfirmationEvent) ([]cognito.Attribute, error) {
		attrs := []cognito.Attribute{
			{Name: "custom:Approved", Value: "false"},
		}
		return attrs, nil
	}

	lambda.Start(handler.Handle)
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd packages/functions && go test ./user-onboarding/... -run TestSignupNotification -v`
Expected: PASS.

- [ ] **Step 6: Verify it still builds**

Run: `make -C packages/functions build-user-onboarding`
Expected: exits 0.

- [ ] **Step 7: Checkpoint (do NOT commit)**

Leave changes staged.

---

### Task 3: Consumer — `user-approval` lambda

A self-contained SNS-triggered Go lambda that applies decisions to Cognito. Mirrors the meal-planner reference. Includes its own Makefile targets so it is buildable/packageable.

**Files:**
- Create: `packages/functions/user-approval/cmd/main.go`
- Create: `packages/functions/user-approval/cmd/decision.go`
- Create: `packages/functions/user-approval/cmd/cognito.go`
- Create: `packages/functions/user-approval/cmd/notifier.go`
- Create: `packages/functions/user-approval/cmd/decision_test.go`
- Modify: `packages/functions/Makefile` (add `build-user-approval` / `package-user-approval`, wire into aggregates)

**Interfaces:**
- Consumes: `platform/notifications.Message` (for failure alerts); aws-sdk-go-v2 cognito + sns (already in `go.mod`).
- Produces (internal to this package):
  - `type decision struct { Source, CallbackID, Action, Payload string }` (json tags: `source`, `callbackId`, `action`, `payload`)
  - `type approver interface { ApproveUser(string) error; DeleteUser(string) error; IsApproved(string) (bool, error) }`
  - `type notifier interface { Notify(sourceDescription, content string) error }`
  - `func handleDecision(a approver, n notifier, d decision) error`
  - `func makeHandler(a approver, n notifier) func(context.Context, events.SNSEvent) error`
  - consts `actionApprove = "approve"`, `actionReject = "reject"`, `appSource = "alexandria-onboard-users"`

- [ ] **Step 1: Write the failing test**

Create `packages/functions/user-approval/cmd/decision_test.go`:

```go
package main

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/aws/aws-lambda-go/events"
)

type fakeApprover struct {
	approveErr    error
	deleteErr     error
	isApprovedErr error
	approved      bool
	approvedUser  string
	deletedUser   string
}

func (f *fakeApprover) ApproveUser(u string) error        { f.approvedUser = u; return f.approveErr }
func (f *fakeApprover) DeleteUser(u string) error         { f.deletedUser = u; return f.deleteErr }
func (f *fakeApprover) IsApproved(u string) (bool, error) { return f.approved, f.isApprovedErr }

type fakeNotifier struct {
	alerts      int
	lastContent string
}

func (f *fakeNotifier) Notify(_ string, content string) error {
	f.alerts++
	f.lastContent = content
	return nil
}

func TestHandleDecision_Approve(t *testing.T) {
	a, n := &fakeApprover{}, &fakeNotifier{}
	if err := handleDecision(a, n, decision{Action: actionApprove, Payload: "U1", CallbackID: "x@y.z"}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.approvedUser != "U1" {
		t.Fatalf("approvedUser = %q, want U1", a.approvedUser)
	}
	if n.alerts != 0 {
		t.Fatalf("expected no alert on success, got %d", n.alerts)
	}
}

func TestHandleDecision_Reject(t *testing.T) {
	a, n := &fakeApprover{}, &fakeNotifier{}
	if err := handleDecision(a, n, decision{Action: actionReject, Payload: "U2", CallbackID: "x@y.z"}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.deletedUser != "U2" {
		t.Fatalf("deletedUser = %q, want U2", a.deletedUser)
	}
	if n.alerts != 0 {
		t.Fatalf("expected no alert on success, got %d", n.alerts)
	}
}

func TestHandleDecision_ApproveError_AlertsWithEmail(t *testing.T) {
	a, n := &fakeApprover{approveErr: errors.New("boom")}, &fakeNotifier{}
	err := handleDecision(a, n, decision{Action: actionApprove, Payload: "U3", CallbackID: "fail@y.z"})
	if err == nil {
		t.Fatal("expected error to propagate")
	}
	if n.alerts != 1 {
		t.Fatalf("expected 1 failure alert, got %d", n.alerts)
	}
	if !strings.Contains(n.lastContent, "fail@y.z") {
		t.Fatalf("alert content missing email: %q", n.lastContent)
	}
}

func TestHandleDecision_RejectError_Alerts(t *testing.T) {
	a, n := &fakeApprover{deleteErr: errors.New("boom")}, &fakeNotifier{}
	if err := handleDecision(a, n, decision{Action: actionReject, Payload: "U4", CallbackID: "x@y.z"}); err == nil {
		t.Fatal("expected error to propagate")
	}
	if n.alerts != 1 {
		t.Fatalf("expected 1 failure alert, got %d", n.alerts)
	}
}

func TestHandleDecision_Reject_AlreadyApproved_SkipsDelete(t *testing.T) {
	a, n := &fakeApprover{approved: true}, &fakeNotifier{}
	if err := handleDecision(a, n, decision{Action: actionReject, Payload: "U9", CallbackID: "x@y.z"}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.deletedUser != "" {
		t.Fatalf("must NOT delete an already-approved user, deleted %q", a.deletedUser)
	}
	if n.alerts != 1 {
		t.Fatalf("expected 1 reject-ignored alert, got %d", n.alerts)
	}
	if !strings.Contains(n.lastContent, "x@y.z") {
		t.Fatalf("alert missing email: %q", n.lastContent)
	}
}

func TestHandleDecision_Reject_IsApprovedError_Alerts(t *testing.T) {
	a, n := &fakeApprover{isApprovedErr: errors.New("boom")}, &fakeNotifier{}
	if err := handleDecision(a, n, decision{Action: actionReject, Payload: "U9", CallbackID: "x@y.z"}); err == nil {
		t.Fatal("expected error to propagate")
	}
	if a.deletedUser != "" {
		t.Fatal("must not delete when approval check failed")
	}
	if n.alerts != 1 {
		t.Fatalf("expected 1 failure alert, got %d", n.alerts)
	}
}

func TestHandleDecision_UnknownAction_Ignored(t *testing.T) {
	a, n := &fakeApprover{}, &fakeNotifier{}
	if err := handleDecision(a, n, decision{Action: "nope", Payload: "U5"}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.approvedUser != "" || a.deletedUser != "" || n.alerts != 0 {
		t.Fatal("unknown action should be a no-op")
	}
}

func snsEvent(message string) events.SNSEvent {
	return events.SNSEvent{Records: []events.SNSEventRecord{{SNS: events.SNSEntity{Message: message}}}}
}

func TestMakeHandler_IgnoresForeignSource(t *testing.T) {
	a, n := &fakeApprover{}, &fakeNotifier{}
	h := makeHandler(a, n)
	msg := `{"source":"some-other-app","action":"approve","payload":"U1","callbackId":"x@y.z"}`
	if err := h(context.Background(), snsEvent(msg)); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.approvedUser != "" {
		t.Fatalf("foreign source must be ignored, approved %q", a.approvedUser)
	}
}

func TestMakeHandler_ProcessesOwnSource(t *testing.T) {
	a, n := &fakeApprover{}, &fakeNotifier{}
	h := makeHandler(a, n)
	msg := `{"source":"alexandria-onboard-users","action":"approve","payload":"U1","callbackId":"x@y.z"}`
	if err := h(context.Background(), snsEvent(msg)); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.approvedUser != "U1" {
		t.Fatalf("own-source decision not processed, approvedUser = %q", a.approvedUser)
	}
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/functions && go test ./user-approval/... -v`
Expected: FAIL — build error, `undefined: handleDecision`, `decision`, etc.

- [ ] **Step 3: Implement `decision.go`**

Create `packages/functions/user-approval/cmd/decision.go`:

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/aws/aws-lambda-go/events"
	"github.com/rs/zerolog/log"
)

// Action IDs must match the buttons emitted by user-onboarding's signup
// notification (packages/functions/user-onboarding/cmd/main.go).
const (
	actionApprove = "approve"
	actionReject  = "reject"
)

// appSource is this application's notification source. The SNS subscription
// already filters on it (filter_policy), but we re-check in code so a
// misconfigured subscription can never make us act on another app's decision.
const appSource = "alexandria-onboard-users"

// decision is the shape the platform alerter responder publishes onto the
// alerting-responses topic. The json tags ARE the wire contract with the
// responder; we consume only the fields we act on.
type decision struct {
	Source     string `json:"source"`
	CallbackID string `json:"callbackId"` // the user's email (human label)
	Action     string `json:"action"`     // "approve" | "reject"
	Payload    string `json:"payload"`    // the Cognito username
}

// approver applies an admin decision to a Cognito user.
type approver interface {
	ApproveUser(username string) error
	DeleteUser(username string) error
	IsApproved(username string) (bool, error)
}

// notifier publishes a best-effort failure alert back to Slack.
type notifier interface {
	Notify(sourceDescription, content string) error
}

// handleDecision applies one decision. On a Cognito failure it emits a Slack
// alert (the responder already optimistically confirmed the click, so a silent
// failure would otherwise be invisible) and returns the error for logging.
func handleDecision(a approver, n notifier, d decision) error {
	switch d.Action {
	case actionApprove:
		if err := a.ApproveUser(d.Payload); err != nil {
			alertFailure(n, d, err)
			return err
		}
		log.Info().Str("email", d.CallbackID).Msg("User approved via Slack")
	case actionReject:
		// Guard: the Slack buttons never expire, so a Reject can arrive after the
		// user was already approved via another path (CLI, a second admin, or a
		// linked-existing account). Deleting an active user would orphan their
		// DynamoDB rows, so skip the delete and notify instead.
		approved, err := a.IsApproved(d.Payload)
		if err != nil {
			alertFailure(n, d, err)
			return err
		}
		if approved {
			log.Warn().Str("email", d.CallbackID).Msg("Reject ignored: user already approved")
			alertRejectIgnored(n, d)
			return nil
		}
		if err := a.DeleteUser(d.Payload); err != nil {
			alertFailure(n, d, err)
			return err
		}
		log.Info().Str("email", d.CallbackID).Msg("User rejected (deleted) via Slack")
	default:
		log.Warn().Str("action", d.Action).Msg("Unknown decision action; ignoring")
	}
	return nil
}

// alertFailure publishes a Markdown failure alert. The email is fenced as inline
// code (may contain _). Best-effort: a failed alert is only logged.
func alertFailure(n notifier, d decision, cause error) {
	content := fmt.Sprintf(
		"# ⚠️ Signup Decision Failed\n\n- **Action:** %s\n- **User:** `%s`\n- **App:** Alexandria\n- **Error:** %s",
		d.Action, d.CallbackID, cause.Error())
	if err := n.Notify("", content); err != nil {
		log.Error().Err(err).Msg("Failed to publish decision-failure alert")
	}
}

// alertRejectIgnored notifies operators that a Reject was a no-op because the
// user is already approved. Best-effort, like alertFailure.
func alertRejectIgnored(n notifier, d decision) {
	content := fmt.Sprintf(
		"# ℹ️ Reject Ignored\n\n- **User:** `%s`\n- **App:** Alexandria\n- **Reason:** already approved (via another path); not deleted to avoid orphaning data",
		d.CallbackID)
	if err := n.Notify("", content); err != nil {
		log.Error().Err(err).Msg("Failed to publish reject-ignored alert")
	}
}

// makeHandler builds the SNS event handler. It always returns nil: failures are
// alerted + logged, and returning an error would make SNS retry and re-process
// (double-alert). Records are independent, so one bad record never blocks others.
func makeHandler(a approver, n notifier) func(context.Context, events.SNSEvent) error {
	return func(ctx context.Context, e events.SNSEvent) error {
		for _, rec := range e.Records {
			var d decision
			if err := json.Unmarshal([]byte(rec.SNS.Message), &d); err != nil {
				log.Error().Err(err).Msg("Failed to unmarshal decision; skipping record")
				continue
			}
			// Defensive: only act on this app's decisions (the SNS filter policy
			// should already guarantee this).
			if d.Source != appSource {
				log.Warn().Str("source", d.Source).Msg("Decision for a different app; ignoring")
				continue
			}
			if err := handleDecision(a, n, d); err != nil {
				log.Error().Err(err).Str("action", d.Action).Msg("Decision failed")
			}
		}
		return nil
	}
}
```

- [ ] **Step 4: Implement `cognito.go`**

Create `packages/functions/user-approval/cmd/cognito.go`:

```go
package main

import (
	"context"
	"errors"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
)

type cognito struct {
	client     *cognitoidentityprovider.Client
	userPoolId string
}

func newCognito(region, userPoolId string) *cognito {
	cfg, _ := config.LoadDefaultConfig(context.TODO(), config.WithRegion(region))
	return &cognito{client: cognitoidentityprovider.NewFromConfig(cfg), userPoolId: userPoolId}
}

// ApproveUser flips custom:Approved to "true". Idempotent: a no-op on an
// already-approved user.
func (c *cognito) ApproveUser(username string) error {
	_, err := c.client.AdminUpdateUserAttributes(context.TODO(), &cognitoidentityprovider.AdminUpdateUserAttributesInput{
		UserPoolId: aws.String(c.userPoolId),
		Username:   aws.String(username),
		UserAttributes: []types.AttributeType{
			{Name: aws.String("custom:Approved"), Value: aws.String("true")},
		},
	})
	return err
}

// DeleteUser removes the pending Cognito user. A reject of an already-deleted
// user is treated as success — the desired end state (user gone) already holds,
// which keeps the action idempotent under Slack re-delivery.
func (c *cognito) DeleteUser(username string) error {
	_, err := c.client.AdminDeleteUser(context.TODO(), &cognitoidentityprovider.AdminDeleteUserInput{
		UserPoolId: aws.String(c.userPoolId),
		Username:   aws.String(username),
	})
	var notFound *types.UserNotFoundException
	if errors.As(err, &notFound) {
		return nil
	}
	return err
}

// IsApproved reports whether the user's custom:Approved attribute is "true".
// Used to avoid deleting a user who was already approved via another path.
func (c *cognito) IsApproved(username string) (bool, error) {
	out, err := c.client.AdminGetUser(context.TODO(), &cognitoidentityprovider.AdminGetUserInput{
		UserPoolId: aws.String(c.userPoolId),
		Username:   aws.String(username),
	})
	if err != nil {
		// An already-deleted user (duplicate reject / SNS redelivery) reports
		// "not approved" so the caller falls through to DeleteUser, which also
		// swallows not-found — keeping reject idempotent (matches DeleteUser).
		var notFound *types.UserNotFoundException
		if errors.As(err, &notFound) {
			return false, nil
		}
		return false, err
	}
	for _, attr := range out.UserAttributes {
		if attr.Name != nil && *attr.Name == "custom:Approved" {
			return attr.Value != nil && *attr.Value == "true", nil
		}
	}
	return false, nil
}
```

- [ ] **Step 5: Implement `notifier.go`**

Create `packages/functions/user-approval/cmd/notifier.go`:

```go
package main

import (
	"context"
	"encoding/json"

	"github.com/Maev4l/platform/notifications"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sns"
	"github.com/rs/zerolog/log"
)

type snsNotifier struct {
	client   *sns.Client
	topicArn string
}

func newNotifier(region, topicArn string) *snsNotifier {
	cfg, _ := config.LoadDefaultConfig(context.TODO(), config.WithRegion(region))
	return &snsNotifier{client: sns.NewFromConfig(cfg), topicArn: topicArn}
}

// Notify publishes a Slack-targeted Markdown alert on the shared alerting topic
// using the shared notifications.Message contract.
func (n *snsNotifier) Notify(sourceDescription, content string) error {
	if n.topicArn == "" {
		log.Warn().Msg("SNS_TOPIC_ARN not configured, skipping notification")
		return nil
	}
	body, err := json.Marshal(notifications.Message{
		Target:            "slack",
		Source:            "alexandria-user-approval",
		SourceDescription: sourceDescription,
		Content:           content,
		Format:            "markdown",
	})
	if err != nil {
		return err
	}
	_, err = n.client.Publish(context.TODO(), &sns.PublishInput{
		TargetArn: aws.String(n.topicArn),
		Message:   aws.String(string(body)),
	})
	return err
}
```

- [ ] **Step 6: Implement `main.go`**

Create `packages/functions/user-approval/cmd/main.go`:

```go
// Alexandria user-approval lambda — consumes Slack approve/reject decisions
// from the alerting-responses SNS topic and applies them to the Cognito user.
package main

import (
	"os"

	"github.com/aws/aws-lambda-go/lambda"
)

func main() {
	region := os.Getenv("REGION")
	userPoolId := os.Getenv("USER_POOL_ID")
	topicArn := os.Getenv("SNS_TOPIC_ARN")

	a := newCognito(region, userPoolId)
	n := newNotifier(region, topicArn)

	lambda.Start(makeHandler(a, n))
}
```

- [ ] **Step 7: Tidy modules and run the tests**

Run:
```bash
cd packages/functions
go mod tidy
go test ./user-approval/... -v
```
Expected: all tests PASS.

- [ ] **Step 8: Add Makefile targets for user-approval**

In `packages/functions/Makefile` (the `.PHONY` line already includes the approval targets from Task 1):

Add after `build-user-onboarding`:

```makefile
build-user-approval:
	GOOS=$(GOOS) GOARCH=$(GOARCH) go build -ldflags="$(LDFLAGS)" -o user-approval/$(BIN_DIR)/bootstrap ./user-approval/cmd
```

Update the aggregate `build` target to append it:

```makefile
build: build-api build-indexer build-consistency-manager build-user-onboarding build-user-approval
```

Add after `package-user-onboarding`:

```makefile
package-user-approval: build-user-approval
	mkdir -p user-approval/$(PACKAGE_DIR)
	cd user-approval/$(BIN_DIR) && zip ../$(PACKAGE_DIR)/user-approval.zip bootstrap
```

Update the aggregate `package` target to append it:

```makefile
package: package-api package-indexer package-consistency-manager package-user-onboarding package-user-approval
```

In `clean`, add:

```makefile
	rm -rf user-approval/$(BIN_DIR)
	rm -rf user-approval/$(PACKAGE_DIR)
```

- [ ] **Step 9: Verify the lambda builds**

Run: `make -C packages/functions build-user-approval`
Expected: exits 0; `packages/functions/user-approval/bin/bootstrap` exists.

- [ ] **Step 10: Checkpoint (do NOT commit)**

Leave changes staged.

---

### Task 4: Infrastructure — wire both lambdas

Bump module versions, add the responses-topic data source, rename the onboarding module/policy, and add the user-approval function + SNS trigger + IAM policy.

**Files:**
- Modify: `packages/infrastructure/functions.tf`
- Modify: `packages/infrastructure/sns.tf`
- Modify: `packages/infrastructure/iam.tf`
- Modify: `packages/infrastructure/cognito.tf`

**Interfaces:**
- Consumes: `module.user_onboarding.function_arn`, `module.user_approval.function_name/arn`, `data.aws_sns_topic.alerting.arn`, `data.aws_sns_topic.alerting_responses.arn`, `aws_iam_policy.user_onboarding.arn`, `aws_iam_policy.user_approval.arn`, `aws_cognito_user_pool.alexandria_user_pool.{id,arn}`.

- [ ] **Step 1: Bump all `terraform-modules` refs to v1.8.1**

In `packages/infrastructure/functions.tf`, replace every `?ref=v1.7.1` with `?ref=v1.8.1` (10 occurrences: api, api_trigger, indexer, indexer_trigger, consistency_manager, consistency_manager_trigger, user_management→user_onboarding, user_management_trigger→user_onboarding_trigger, image_processor, image_processor_trigger).

Run to verify none remain:
```bash
grep -c "ref=v1.7.1" packages/infrastructure/functions.tf
```
Expected: `0`.

- [ ] **Step 2: Add the alerting-responses data source**

In `packages/infrastructure/sns.tf`, append (keep the existing `alerting` block):

```hcl
# Responses topic: the alerter responder republishes Slack approve/reject
# decisions here. user-approval subscribes with a source filter policy.
data "aws_sns_topic" "alerting_responses" {
  name = "alerting-responses"
}
```

- [ ] **Step 3: Update the filename locals**

In `packages/infrastructure/functions.tf`, in the `locals` block, replace the `userManagementFilename` line with:

```hcl
  userOnboardingFilename = "../functions/user-onboarding/dist/user-onboarding.zip"
  userApprovalFilename   = "../functions/user-approval/dist/user-approval.zip"
```

- [ ] **Step 4: Rename the onboarding module + add user-approval modules**

In `packages/infrastructure/functions.tf`, replace the entire `module "user_management"` and `module "user_management_trigger"` blocks with:

```hcl
module "user_onboarding" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-function?ref=v1.8.1"

  function_name = "alexandria-user-onboarding"
  architecture  = "arm64"
  memory_size   = 128

  additional_policy_arns = [aws_iam_policy.user_onboarding.arn]

  zip = {
    filename = local.userOnboardingFilename
    runtime  = "provided.al2023"
    handler  = "bootstrap"
    hash     = filebase64sha256("../functions/user-onboarding/bin/bootstrap")
  }

  environment_variables = {
    REGION        = var.region
    SNS_TOPIC_ARN = data.aws_sns_topic.alerting.arn
  }
}

module "user_onboarding_trigger" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-cognito?ref=v1.8.1"

  function_name = module.user_onboarding.function_name
  function_arn  = module.user_onboarding.function_arn

  user_pool_id = aws_cognito_user_pool.alexandria_user_pool.id
}

module "user_approval" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-function?ref=v1.8.1"

  function_name = "alexandria-user-approval"
  architecture  = "arm64"
  memory_size   = 128

  additional_policy_arns = [aws_iam_policy.user_approval.arn]

  zip = {
    filename = local.userApprovalFilename
    runtime  = "provided.al2023"
    handler  = "bootstrap"
    hash     = filebase64sha256("../functions/user-approval/bin/bootstrap")
  }

  environment_variables = {
    REGION        = var.region
    USER_POOL_ID  = aws_cognito_user_pool.alexandria_user_pool.id
    SNS_TOPIC_ARN = data.aws_sns_topic.alerting.arn
  }
}

# Subscribes user-approval to the alerter's alerting-responses topic. The filter
# policy matches the "source" message attribute the responder sets, so this
# lambda only sees decisions originating from Alexandria signup alerts.
module "user_approval_trigger" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-sns?ref=v1.8.1"

  function_name = module.user_approval.function_name
  function_arn  = module.user_approval.function_arn
  topic_arn     = data.aws_sns_topic.alerting_responses.arn
  filter_policy = jsonencode({ source = ["alexandria-onboard-users"] })
}
```

- [ ] **Step 5: Repoint the Cognito trigger**

In `packages/infrastructure/cognito.tf`, in `aws_cognito_user_pool.alexandria_user_pool`'s `lambda_config`, replace both `module.user_management.function_arn` references:

```hcl
  lambda_config {
    pre_sign_up       = module.user_onboarding.function_arn
    post_confirmation = module.user_onboarding.function_arn
  }
```

- [ ] **Step 6: Rename the onboarding IAM policy + add the user-approval policy**

In `packages/infrastructure/iam.tf`, replace the `data "aws_iam_policy_document" "user_management"` and `resource "aws_iam_policy" "user_management"` blocks with (statements unchanged; only labels/name change), and append the new user-approval policy:

```hcl
#
# User Onboarding Policy (role managed by lambda-function module)
#
data "aws_iam_policy_document" "user_onboarding" {
  statement {
    effect    = "Allow"
    actions   = ["sns:Publish"]
    resources = [data.aws_sns_topic.alerting.arn]
  }

  statement {
    effect = "Allow"
    actions = [
      "cognito-idp:AdminGetUser",
      "cognito-idp:AdminUpdateUserAttributes",
      "cognito-idp:AdminLinkProviderForUser",
      "cognito-idp:ListUsers",
    ]
    resources = ["arn:aws:cognito-idp:${local.region}:${local.account_id}:userpool/*"]
  }
}

resource "aws_iam_policy" "user_onboarding" {
  name   = "alexandria-user-onboarding"
  policy = data.aws_iam_policy_document.user_onboarding.json
}

#
# User Approval Policy (applies Slack approve/reject decisions)
#
data "aws_iam_policy_document" "user_approval" {
  statement {
    effect = "Allow"
    actions = [
      "cognito-idp:AdminGetUser",
      "cognito-idp:AdminUpdateUserAttributes",
      "cognito-idp:AdminDeleteUser",
    ]
    resources = [aws_cognito_user_pool.alexandria_user_pool.arn]
  }

  statement {
    effect    = "Allow"
    actions   = ["sns:Publish"]
    resources = [data.aws_sns_topic.alerting.arn]
  }
}

resource "aws_iam_policy" "user_approval" {
  name   = "alexandria-user-approval"
  policy = data.aws_iam_policy_document.user_approval.json
}
```

- [ ] **Step 7: Build the binaries so `filebase64sha256` targets exist, then validate**

The `hash = filebase64sha256(".../bin/bootstrap")` calls require the binaries to exist at plan time.

Run:
```bash
make -C packages/functions build-user-onboarding build-user-approval
terraform -chdir=packages/infrastructure fmt
terraform -chdir=packages/infrastructure init -upgrade
terraform -chdir=packages/infrastructure validate
```
Expected: `fmt` reports the reformatted files (or none), `init -upgrade` downloads `terraform-modules` v1.8.1 + `lambda-trigger-sns`, `validate` prints `Success! The configuration is valid.`

- [ ] **Step 8: Checkpoint (do NOT commit)**

Optionally run `terraform -chdir=packages/infrastructure plan` to eyeball the diff: recreation of `alexandria-user-management` → `alexandria-user-onboarding` (function + IAM policy), new `alexandria-user-approval` function + SNS subscription + policy, Cognito trigger rewire. Do not apply. Leave staged.

---

### Task 5: Documentation

Update living docs to reflect the rename and the new Slack approve/reject flow.

**Files:**
- Modify: `.claude/backend.md`
- Modify: `.claude/authn-scheme.md`
- Verify (modify only if they name the lambda): `.claude/CLAUDE.md`, memory index

- [ ] **Step 1: Update `backend.md`**

In `.claude/backend.md`, under the backend functions list:
- Rename the **User management** subsection heading and its `Source code:` path from `user-management` to `user-onboarding`; keep the description of signup approval + SNS notification.
- Add a new **User approval** subsection after it:

```markdown
### User approval

Source code: @../packages/functions/user-approval

SNS-triggered Golang Lambda. Consumes admin approve/reject decisions that the
`platform/alerter` responder republishes to the `alerting-responses` topic
(subscription filtered to `source = "alexandria-onboard-users"`). On **approve**
it sets `custom:Approved="true"`; on **reject** it deletes the pending Cognito
user (guarded: skips deletion + alerts if the user was already approved via
another path). Cognito failures are surfaced as `alerting-events` alerts.

It is written in Golang.
```

- [ ] **Step 2: Update `authn-scheme.md`**

In `.claude/authn-scheme.md`:
- In the architecture diagram / prose that names the `user-management Lambda`, rename to `user-onboarding` and note the sibling `user-approval` consumer.
- In the **Admin Approval Flow** section, add the Slack button path alongside the CLI. After the "Slack message" step, present the two approval routes:

```markdown
   Admin approves/rejects via either route:

   **A. Slack buttons (on the Access Request alert)**
   - Approve → user-approval Lambda sets custom:Approved = "true"
   - Reject  → user-approval Lambda deletes the pending Cognito user
     (skipped + re-alerted if already approved via another path)

   **B. CLI (unchanged)**
   $ alexandria users approve user@example.com
```

- [ ] **Step 3: Verify CLAUDE.md and the memory index**

Run:
```bash
grep -rn "user-management" .claude/CLAUDE.md ~/.claude/projects/-Users-jrsue-dev-repos-alexandria/memory/ 2>/dev/null
```
Expected: no matches. If any name the lambda, update to `user-onboarding`; otherwise leave unchanged.

- [ ] **Step 4: Checkpoint (do NOT commit)**

Leave changes staged.

---

### Task 6: Final verification + single commit

- [ ] **Step 1: Full test + build sweep**

Run:
```bash
cd packages/functions
go build ./...
go test ./...
go vet ./...
make build
```
Expected: all succeed.

- [ ] **Step 2: Terraform final check**

Run:
```bash
terraform -chdir=packages/infrastructure fmt -check
terraform -chdir=packages/infrastructure validate
```
Expected: no unformatted files; `Success! The configuration is valid.`

- [ ] **Step 3: Review the full staged diff**

Run: `git status && git diff --stat HEAD`
Confirm: dir rename, producer + Interactive, new user-approval package, Makefile, four Terraform files, two docs, `go.mod`/`go.sum`.

- [ ] **Step 4: Commit — ONLY after the user gives the go**

Do not run this until the user explicitly approves committing.

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(user-management): Slack approve/reject for signups; rename user-management → user-onboarding

- user-onboarding: attach Approve/Reject Interactive block to the signup alert
  (bumps platform/notifications v1.1.0 → v1.2.0)
- user-approval: new SNS-triggered lambda applying decisions to Cognito
  (approve → custom:Approved=true; reject → AdminDeleteUser, guarded)
- infra: bump terraform-modules v1.7.1 → v1.8.1; alerting-responses trigger
  with source filter; rename onboarding module/policy; user-approval policy
- docs: backend.md + authn-scheme.md

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- Problem / solution overview → Tasks 2 (producer) + 3 (consumer). ✓
- Naming rename → Task 1 (code) + Task 4 (infra) + Task 5 (docs). ✓
- Component 1 (producer Interactive, notifications v1.2.0 bump) → Task 2. ✓
- Component 2 (consumer: two-level filter, approve/reject, guard, idempotency, failure alert, always-nil handler) → Task 3 (code + tests). ✓
- Component 3 (module bump v1.8.1, alerting_responses data source, module/local/policy renames, user_approval function+trigger+policy, Cognito repoint) → Task 4. ✓
- Rename mechanics (dir, Makefile, main.go header, docs) → Tasks 1 + 3 (Makefile) + 5 (docs). ✓
- Testing (consumer unit tests incl. reject-already-approved, not-found, error→alert, unknown, wrong-source; producer Interactive assertion) → Tasks 3 + 2. ✓
- Prerequisites (responder deployed) → confirmed live by user; no task needed. ✓
- Known edge case (pre_sign_up vs post_confirmation) → behavioral, documented in spec; no code. ✓
- Out of scope (rate limit, soft-reject, CLI) → not implemented. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full content; commands have expected output. ✓

**Type consistency:** `decision{Source,CallbackID,Action,Payload}`, `approver{ApproveUser,DeleteUser,IsApproved}`, `notifier.Notify`, `handleDecision`, `makeHandler`, consts `actionApprove/actionReject/appSource` used identically across `decision.go`, `cognito.go`, `main.go`, and `decision_test.go`. `signupNotification` signature matches test. Terraform identifiers (`user_onboarding`, `user_approval`, `alerting_responses`) consistent across functions.tf / iam.tf / cognito.tf / sns.tf. ✓
