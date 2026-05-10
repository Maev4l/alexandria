# Terraform Modules v1.7.1 Bump — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bump `Maev4l/terraform-modules` from `v1.6.0` to `v1.7.1` in `packages/infrastructure/functions.tf` and migrate `module "api_trigger"` to the new multi-Lambda `integrations` signature.

**Architecture:** Single-file edit. 8 of 9 module references change only the `?ref=` pin. The `api_trigger` module block is rewritten to use the new `api_name` + `integrations` map inputs. Destroy/recreate accepted for the 7 inner resources whose state keys change.

**Tech Stack:** Terraform 1.15, AWS provider 6.35, custom modules at `github.com/Maev4l/terraform-modules`.

**Spec:** `docs/superpowers/specs/2026-05-10-terraform-modules-v1.7.1-bump-design.md`

**File Structure:**
- Modify: `packages/infrastructure/functions.tf` (only file touched)

---

## Task 1: Bump `?ref=` from v1.6.0 to v1.7.1 on the 8 unchanged modules

These 8 module instances have no signature changes between v1.6.0 and v1.7.1 — pure version pin replacement.

**Files:**
- Modify: `packages/infrastructure/functions.tf` (lines 13, 72, 98, 147, 169, 206, 228, 238, 257)

Note: line 45 (`api_trigger`) is intentionally **not** changed in this task — it gets fully rewritten in Task 2.

- [ ] **Step 1: Apply the version pin replacements**

In `packages/infrastructure/functions.tf`, replace `?ref=v1.6.0` with `?ref=v1.7.1` on these 9 specific lines (we'll bump the api_trigger pin here too, since Task 2 will rewrite the rest of that block):

```diff
-  source = "github.com/Maev4l/terraform-modules//modules/lambda-function?ref=v1.6.0"
+  source = "github.com/Maev4l/terraform-modules//modules/lambda-function?ref=v1.7.1"
```

(applied to all 5 `lambda-function` instances: `api`, `indexer`, `consistency_manager`, `user_management`, `image_processor`)

```diff
-  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-apigw?ref=v1.6.0"
+  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-apigw?ref=v1.7.1"
```

```diff
-  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-dynamodb?ref=v1.6.0"
+  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-dynamodb?ref=v1.7.1"
```

(applied to both `indexer_trigger` and `consistency_manager_trigger`)

```diff
-  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-cognito?ref=v1.6.0"
+  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-cognito?ref=v1.7.1"
```

```diff
-  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-s3?ref=v1.6.0"
+  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-s3?ref=v1.7.1"
```

A single `replace_all` of `?ref=v1.6.0` → `?ref=v1.7.1` accomplishes all of the above in one shot.

- [ ] **Step 2: Verify no v1.6.0 references remain**

Run: `grep -n "v1.6.0" packages/infrastructure/functions.tf`
Expected: no output (exit code 1).

Run: `grep -c "?ref=v1.7.1" packages/infrastructure/functions.tf`
Expected: `9`.

---

## Task 2: Rewrite `module "api_trigger"` for the v1.7.1 signature

Replace the flat `function_name`/`function_arn`/`invoke_arn`/`routes` inputs with the new `api_name` + `integrations` map.

**Files:**
- Modify: `packages/infrastructure/functions.tf` (lines 44–69, the entire `module "api_trigger"` block)

- [ ] **Step 1: Replace the api_trigger module block**

Replace the existing block (lines 44–69) with this exact content. The `?ref=v1.7.1` was already set in Task 1; the rest of the body changes.

```hcl
module "api_trigger" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-apigw?ref=v1.7.1"

  # Pinned to v1.6.0's auto-derived name ("<function_name>-http-api") so
  # aws_apigatewayv2_api.this is preserved in place. Changing this value
  # would force a name update on the HTTP API resource.
  api_name = "alexandria-api-http-api"

  cors                         = false
  disable_execute_api_endpoint = false

  # JWT Authorizer integrated with Cognito User Pool
  authorizer = {
    name     = "alexandria-cognito-authorizer"
    issuer   = "https://cognito-idp.${var.region}.amazonaws.com/${aws_cognito_user_pool.alexandria_user_pool.id}"
    audience = [aws_cognito_user_pool_client.alexandria_client.id]
  }

  integrations = {
    api = {
      function_name = module.api.function_name
      function_arn  = module.api.function_arn
      invoke_arn    = module.api.invoke_arn
      routes = [
        "GET /api/v1/libraries",
        "POST /api/v1/libraries",
        "ANY /api/v1/libraries/{proxy+}",
        "POST /api/v1/detections",
        "POST /api/v1/search",
      ]
    }
  }
}
```

- [ ] **Step 2: Format the file**

Run: `cd packages/infrastructure && terraform fmt functions.tf`
Expected: either no output (already formatted) or the filename printed (rewritten in canonical style).

---

## Task 3: Validate the configuration

Catch syntax / type errors before talking to AWS.

- [ ] **Step 1: Re-initialize to pull v1.7.1 modules**

Run: `cd packages/infrastructure && terraform init -upgrade`
Expected: lines like `Downloading git::https://github.com/Maev4l/terraform-modules.git?ref=v1.7.1 …` and `Terraform has been successfully initialized!`

- [ ] **Step 2: Run terraform validate**

Run: `cd packages/infrastructure && terraform validate`
Expected: `Success! The configuration is valid.`

If validate fails (e.g., unknown variable, wrong type), fix the offending block in `functions.tf` and re-run until it succeeds.

---

## Task 4: Verify the plan diff matches expectations

The plan must show exactly the changes the spec predicts — no more, no less. If the diff includes anything outside `module.api_trigger`, stop and investigate.

- [ ] **Step 1: Generate a saved plan**

Run: `cd packages/infrastructure && terraform plan -out=migration.tfplan`

- [ ] **Step 2: Inspect the plan summary**

Expected resource changes (all inside `module.api_trigger`):

| Action | Resource |
|---|---|
| destroy | `module.api_trigger.aws_apigatewayv2_integration.this` |
| destroy ×5 | `module.api_trigger.aws_apigatewayv2_route.this["GET /api/v1/libraries"]`, `["POST /api/v1/libraries"]`, `["ANY /api/v1/libraries/{proxy+}"]`, `["POST /api/v1/detections"]`, `["POST /api/v1/search"]` |
| destroy | `module.api_trigger.aws_lambda_permission.this` |
| create | `module.api_trigger.aws_apigatewayv2_integration.this["api"]` |
| create ×5 | `module.api_trigger.aws_apigatewayv2_route.this["api:GET /api/v1/libraries"]`, `["api:POST /api/v1/libraries"]`, `["api:ANY /api/v1/libraries/{proxy+}"]`, `["api:POST /api/v1/detections"]`, `["api:POST /api/v1/search"]` |

Expected summary line: `Plan: 7 to add, 0 to change, 7 to destroy.`

The HTTP API itself (`aws_apigatewayv2_api.this`) and the authorizer (`aws_apigatewayv2_authorizer.this`) must **not** appear in the diff. The 8 other modules (`api`, `indexer`, `indexer_trigger`, etc.) must **not** appear in the diff.

- [ ] **Step 3: Stop if the diff is unexpected**

If the plan includes any resource outside the table above — especially anything in `module.api`, `module.indexer`, etc., or a replacement of `aws_apigatewayv2_api.this` — discard the plan, do **not** apply, and investigate before proceeding.

Discard with: `rm migration.tfplan` and re-read the spec.

---

## Task 5: Apply and smoke-test

This is when the brief API outage occurs. Run during a low-traffic window.

- [ ] **Step 1: Apply the saved plan**

Run: `cd packages/infrastructure && terraform apply migration.tfplan`
Expected: `Apply complete! Resources: 7 added, 0 changed, 7 destroyed.`

Outage window: from the moment Terraform starts destroying the integration to the moment all 5 routes are recreated, the API returns errors. Typical duration: 30–60 seconds.

- [ ] **Step 2: Smoke-test the API**

The custom domain and Cognito authorizer are unchanged, so an authenticated call against the existing endpoint should work end-to-end.

Test from the running web client (`alexandria.isnan.eu`): sign in and load the libraries list. The `GET /api/v1/libraries` call should return 200.

Or via curl with a valid Cognito ID token:

```bash
curl -i -H "Authorization: <ID_TOKEN>" \
  https://alexandria.isnan.eu/api/v1/libraries
```

Expected: HTTP 200 with the libraries JSON.

- [ ] **Step 3: Clean up the saved plan file**

Run: `rm packages/infrastructure/migration.tfplan`

---

## Task 6: Commit (user-initiated)

Per the user's git rule, commits are not automatic — review and commit when satisfied.

- [ ] **Step 1: Review the diff**

Run: `git -C /Users/jrsue/dev/repos/alexandria diff packages/infrastructure/functions.tf`
Expected: only the `?ref=` bumps and the `api_trigger` block rewrite.

Also check `.terraform.lock.hcl` for changes:

Run: `git -C /Users/jrsue/dev/repos/alexandria status packages/infrastructure/`

- [ ] **Step 2: Commit when ready**

```bash
cd /Users/jrsue/dev/repos/alexandria
git add packages/infrastructure/functions.tf packages/infrastructure/.terraform.lock.hcl
git commit -m "chore(infra): bump terraform-modules v1.6.0 → v1.7.1

Migrate module \"api_trigger\" to the new multi-Lambda 'integrations'
signature introduced in v1.7.0. The other 8 modules have no signature
changes and only the ?ref= pin is updated.

api_name pinned to 'alexandria-api-http-api' to preserve the existing
HTTP API resource in place. The integration / 5 routes / lambda
permission inside module.api_trigger are recreated under new state keys."
```

---

## Verification Checklist

- [ ] No `v1.6.0` references remain in `packages/infrastructure/functions.tf`.
- [ ] `terraform validate` succeeds.
- [ ] `terraform plan` shows exactly 7 destroys + 7 creates, all inside `module.api_trigger`.
- [ ] `terraform apply` completes without error.
- [ ] Authenticated `GET /api/v1/libraries` returns 200 after apply.
