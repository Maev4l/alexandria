# AWS Lambda Web Adapter Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the alexandria `api` Lambda off the archived `github.com/awslabs/aws-lambda-go-api-proxy` to AWS Lambda Web Adapter (LWA), and turn the api binary into a plain Gin HTTP server runnable locally.

**Architecture:** Rewrite `packages/functions/api/cmd/main.go` as a plain Gin HTTP server listening on `PORT` (default 8080). Attach the public LWA arm64 Lambda Layer (`LambdaAdapterLayerArm64:27`) to the function via Terraform. LWA's auto-loading Lambda Extension translates API Gateway HTTP API v2 events into HTTP requests transparently. No changes to API Gateway, Cognito, IAM, or the three event-driven Go lambdas.

**Tech Stack:** Go 1.25, Gin, AWS Lambda (`provided.al2023`, arm64, zip), Terraform, `github.com/Maev4l/terraform-modules//modules/lambda-function?ref=v1.7.1`, AWS Lambda Web Adapter Layer (`arm64:27` published by AWS account `753240598075`).

**Spec:** `docs/superpowers/specs/2026-05-25-lwa-migration-design.md`

**Operational rules:**
- Per user's global rule (`.claude/rules/git.md`), **never commit/push automatically**. Commit steps below are *suggested messages* — confirm with the user before running each one.
- Per user's global rule, **never run `terraform apply` automatically**. The deploy task spells out the apply command but the user runs it.
- Lint after Go changes (`make lint` in `packages/functions/`).
- Run `terraform fmt` and `terraform validate` after HCL changes.

---

## Task 1: Rewrite api/cmd/main.go as a plain Gin HTTP server

Goal: drop the deprecated proxy/`aws-lambda-go` imports, collapse the `init()` + global `ginLambda` pattern into a single `main()` that runs a normal HTTP server.

**Files:**
- Modify: `packages/functions/api/cmd/main.go` (full rewrite, ~85 lines → ~65 lines)

- [ ] **Step 1: Replace the file contents**

Use `Write` (full replacement) — the structure changes too much for a clean Edit.

```go
package main

import (
	"os"

	"alexandria.isnan.eu/functions/api/handlers"
	"alexandria.isnan.eu/functions/api/repositories/bedrock"
	"alexandria.isnan.eu/functions/api/repositories/cognito"
	"alexandria.isnan.eu/functions/api/repositories/dynamodb"
	storage "alexandria.isnan.eu/functions/api/repositories/s3"
	"alexandria.isnan.eu/functions/api/services"
	"github.com/gin-gonic/gin"
)

func main() {
	gin.SetMode(gin.ReleaseMode)

	router := gin.New()
	router.Use(handlers.HttpLogger())
	router.Use(gin.Recovery())

	region := os.Getenv("REGION")

	db := dynamodb.NewDynamoDB(region)
	storage := storage.NewObjectStorage(region)
	idp := cognito.NewIdp(region)

	// OCR via Bedrock Claude - model configurable via environment variable
	ocrModel := os.Getenv("OCR_MODEL")
	ocr := bedrock.NewOCR(region, ocrModel)

	s := services.NewServices(db, storage, idp, ocr)
	h := handlers.NewHTTPHandler(s)

	g := router.Group("/api/v1")
	g.Use(handlers.TokenParser())
	g.Use(handlers.IdentityLogger())
	g.Use(handlers.ApprovalChecker())

	g.POST("/detections", h.RequestDetection)
	g.POST("/libraries", h.CreateLibrary)
	g.GET("/libraries", h.ListLibraries)
	g.PUT("/libraries/:libraryId", h.UpdateLibrary)
	g.DELETE("/libraries/:libraryId", h.DeleteLibrary)
	g.GET("/libraries/:libraryId/items", h.ListLibraryItems)
	g.POST("/libraries/:libraryId/books", h.CreateBook)
	g.PUT("/libraries/:libraryId/books/:bookId", h.UpdateBook)
	g.POST("/libraries/:libraryId/videos", h.CreateVideo)
	g.PUT("/libraries/:libraryId/videos/:videoId", h.UpdateVideo)
	g.DELETE("/libraries/:libraryId/items/:itemId", h.DeleteItem)
	g.POST("/libraries/:libraryId/share", h.ShareLibrary)
	g.POST("/libraries/:libraryId/unshare", h.UnshareLibrary)
	g.POST("/libraries/:libraryId/items/:itemId/events", h.CreateItemHistoryEvent)
	g.GET("/libraries/:libraryId/items/:itemId/events", h.GetItemHistoryEvents)
	g.DELETE("/libraries/:libraryId/items/:itemId/events", h.DeleteItemHistoryEvents)
	// Collection routes
	g.GET("/libraries/:libraryId/collections", h.ListCollections)
	g.POST("/libraries/:libraryId/collections", h.CreateCollection)
	g.GET("/libraries/:libraryId/collections/:collectionId", h.GetCollection)
	g.PUT("/libraries/:libraryId/collections/:collectionId", h.UpdateCollection)
	g.DELETE("/libraries/:libraryId/collections/:collectionId", h.DeleteCollection)
	g.POST("/search", h.Search)

	// LWA forwards requests to the port set by env (default 8080).
	// Locally (no LWA) the same default lets `go run ./api/cmd` work out of the box.
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	_ = router.Run(":" + port)
}
```

- [ ] **Step 2: Verify the package compiles**

Run:
```bash
cd packages/functions && go build -o /tmp/alexandria-api-buildcheck ./api/cmd && rm /tmp/alexandria-api-buildcheck
```
Expected: exit code 0, no output.

If you see `imported and not used: "github.com/aws/aws-lambda-go/..."` errors, you didn't fully replace the file — re-check Step 1.

- [ ] **Step 3: Verify go vet passes**

Run:
```bash
cd packages/functions && go vet ./api/cmd
```
Expected: exit code 0, no output.

- [ ] **Step 4: Tidy modules**

Run:
```bash
cd packages/functions && go mod tidy
```
Expected: `go.mod` and `go.sum` updated. Inspect the diff with `git diff go.mod`:
- `github.com/awslabs/aws-lambda-go-api-proxy` MUST be removed.
- `github.com/aws/aws-lambda-go` MUST remain (still used by `user-management/cmd/main.go`, `index-items/cmd/main.go`, `consistency-manager/cmd/main.go`).
- Transitive deps brought solely by the proxy (e.g. `github.com/aws/aws-lambda-go-api-proxy/core`) will disappear from `go.sum`.

If `aws-lambda-go` accidentally disappears, that means an event-driven lambda's import got broken — investigate before continuing.

- [ ] **Step 5: Build all four Go lambdas to confirm nothing else regressed**

Run:
```bash
cd packages/functions && make build
```
Expected: produces four `bootstrap` binaries under `api/bin/`, `index-items/bin/`, `consistency-manager/bin/`, `user-management/bin/`. Exit code 0.

- [ ] **Step 6: Run lint**

Run:
```bash
cd packages/functions && make lint
```
Expected: exit code 0, no findings.

If `golangci-lint` flags a new issue in `api/cmd/main.go`, fix it inline before moving on. Common false-positive: an unused import — should be impossible with `go mod tidy` already run, but double-check.

- [ ] **Step 7: Suggested commit**

Confirm with the user, then:
```bash
git add packages/functions/api/cmd/main.go packages/functions/go.mod packages/functions/go.sum
git commit -m "$(cat <<'EOF'
refactor(api): migrate from aws-lambda-go-api-proxy to plain HTTP server

The api lambda now runs as a standard Gin HTTP server on PORT (default
8080). The AWS Lambda Web Adapter Extension on the layer (added in a
follow-up commit) intercepts API Gateway events and forwards them as
HTTP requests, so no Lambda-runtime imports are needed in main.go.

aws-lambda-go-api-proxy is archived on GitHub since 2024-12; LWA is the
official AWS-supported replacement.
EOF
)"
```

---

## Task 2: Local development ergonomics

Goal: make `go run ./api/cmd` ergonomic for the team by formalizing the env-var requirements and adding a Makefile shortcut.

**Files:**
- Create: `packages/functions/api/.env.local.example`
- Modify: `packages/functions/Makefile` (add `run-api-local` target)
- Modify: `.gitignore` (root) — ignore `packages/functions/api/.env.local`

- [ ] **Step 1: Create `packages/functions/api/.env.local.example`**

Use `Write`:

```dotenv
# Copy to .env.local and fill in dev-pool / dev-bucket values before running
# `make run-api-local`. .env.local is gitignored.

# AWS region the dev resources live in
REGION=eu-west-1

# DynamoDB table powering libraries/items
DYNAMODB_TABLE_NAME=alexandria-dev

# S3 bucket holding cover thumbnails and the search index
S3_PICTURES_BUCKET=alexandria-dev
S3_INDEX_BUCKET=alexandria-dev

# Cognito user pool used by the dev web client (must match the JWT you'll send)
USER_POOL_ID=

# Search-index artifact names inside the bucket
GLOBAL_INDEX_FILE_NAME=global-index.tar.gz
SHARE_LIBRARIES_FILE_NAME=shared-libraries.json

# SSM parameter names (the lambda reads secrets from SSM at runtime)
LEK_SECRET_KEY=alexandria.lastevaluatedkey.secret
TMDB_ACCESS_TOKEN=alexandria.tmdb.access.token
SCRAPER_PROXY_API_KEY=alexandria.scraper.proxy.api.key

# Bedrock OCR model for video cover detection
OCR_MODEL=eu.anthropic.claude-haiku-4-5-20251001-v1:0

# Port the local HTTP server binds to (LWA uses 8080 in Lambda)
PORT=8080
```

- [ ] **Step 2: Add `run-api-local` target to the Makefile**

Edit `packages/functions/Makefile`. Add to the `.PHONY` line and append a target at the end of the file (before `clean:` is fine; the order doesn't matter for `make`).

Replace the `.PHONY` line:

Old:
```makefile
.PHONY: build build-api build-indexer build-consistency-manager build-user-management package package-api package-indexer package-user-management clean lint
```

New:
```makefile
.PHONY: build build-api build-indexer build-consistency-manager build-user-management package package-api package-indexer package-user-management clean lint format run-api-local
```

Then append (insert before the existing `clean:` target):
```makefile
# Run the API lambda locally as a plain HTTP server (Web Adapter mode).
# Requires AWS credentials in the environment (e.g. `aws sso login`)
# and env vars sourced from api/.env.local (copy from .env.local.example).
run-api-local:
	@test -f api/.env.local || (echo "Missing api/.env.local — copy from api/.env.local.example"; exit 1)
	@set -a && . ./api/.env.local && set +a && go run ./api/cmd

```

- [ ] **Step 3: Add `.env.local` to root `.gitignore`**

Inspect the current `.gitignore`:
```bash
cat .gitignore
```

Append at the end:
```
# Local dev env files (per-developer secrets)
**/.env.local
```

`**/.env.local` catches any path so future packages can use the same pattern.

- [ ] **Step 4: Verify the Makefile target parses**

Run:
```bash
cd packages/functions && make -n run-api-local 2>&1 | head -5
```
Expected: prints the recipe commands without running them. No `*** missing separator` or `No rule to make target` errors.

The command will print:
```
test -f api/.env.local || (echo "Missing api/.env.local — copy from api/.env.local.example"; exit 1)
set -a && . ./api/.env.local && set +a && go run ./api/cmd
```

- [ ] **Step 5: Suggested commit**

Confirm with the user, then:
```bash
git add packages/functions/Makefile packages/functions/api/.env.local.example .gitignore
git commit -m "$(cat <<'EOF'
chore(api): add local-dev ergonomics for the api lambda

- `make run-api-local` runs the api lambda as a plain HTTP server
- api/.env.local.example documents the required env vars
- .env.local files (per-developer) gitignored

Local runs hit real AWS resources (DynamoDB, S3, Cognito); use a dev
account or scope a dev profile.
EOF
)"
```

---

## Task 3: Local smoke test of the new HTTP server

Goal: prove the rewritten binary serves real Gin routes locally, before touching infra.

**Files:** none modified.

**Preconditions for the engineer:**
- AWS credentials in the shell with read access to the dev DynamoDB table, S3 buckets, and Cognito user pool (e.g. `aws sso login --profile alexandria-dev` followed by exporting `AWS_PROFILE`).
- A real Cognito JWT (`idToken`) from the dev pool — obtain by signing in to the dev web client and copying `idToken` from devtools (`localStorage` or the network tab of a recent request).

- [ ] **Step 1: Populate `api/.env.local`**

```bash
cp packages/functions/api/.env.local.example packages/functions/api/.env.local
```

Then edit it to fill in:
- `REGION` (the actual dev region — likely `eu-west-1` based on the codebase)
- `DYNAMODB_TABLE_NAME` (dev table name, e.g. `alexandria` if there's no separate dev table)
- `S3_PICTURES_BUCKET`, `S3_INDEX_BUCKET` (dev bucket names)
- `USER_POOL_ID` (must match the issuer of the JWT you'll send)

- [ ] **Step 2: Start the server**

In one terminal:
```bash
cd packages/functions && make run-api-local
```
Expected (after a few seconds):
```
[GIN-debug] Listening and serving HTTP on :8080
```

(`gin.SetMode(gin.ReleaseMode)` in the code suppresses the long debug banner; you should still see the listen line.)

If you see `Address already in use`, free port 8080 (`lsof -i :8080`) or change `PORT` in `.env.local`.

- [ ] **Step 3: Hit a read endpoint with a real JWT**

In a second terminal, replace `<JWT>` with the `idToken` value:
```bash
curl -sS -w "\nHTTP %{http_code}\n" \
  -H "Authorization: Bearer <JWT>" \
  http://localhost:8080/api/v1/libraries
```
Expected: `HTTP 200` and a JSON body containing `{ "libraries": [ ... ] }`. The body may be empty if the dev user has no libraries — `{"libraries":[]}` is also a pass.

If you see `HTTP 401` or `HTTP 403`: the JWT is invalid for the configured `USER_POOL_ID`, or expired (Cognito ID tokens last 60 minutes per `cognito.tf`). Refresh and retry.

If you see `HTTP 500`: check the server terminal for the Go stack trace. Most likely AWS credentials issue — confirm `aws sts get-caller-identity` works in the same shell.

- [ ] **Step 4: Hit a route with a path parameter and query string**

Pick a real library ID from the previous response, then:
```bash
curl -sS -w "\nHTTP %{http_code}\n" \
  -H "Authorization: Bearer <JWT>" \
  "http://localhost:8080/api/v1/libraries/<libraryId>/items?limit=5"
```
Expected: `HTTP 200` and a JSON `items` array (or empty). Confirms path-param routing and the LEK-encrypted pagination token path work outside Lambda.

- [ ] **Step 5: Hit a write endpoint (create + delete a throwaway library)**

```bash
curl -sS -w "\nHTTP %{http_code}\n" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"name":"lwa-smoke","description":"delete me"}' \
  http://localhost:8080/api/v1/libraries
```
Expected: `HTTP 201` with `{ "id": "...", "totalItems": 0, "updatedAt": "..." }`.

Then delete it:
```bash
curl -sS -w "\nHTTP %{http_code}\n" -X DELETE \
  -H "Authorization: Bearer <JWT>" \
  http://localhost:8080/api/v1/libraries/<id-from-create>
```
Expected: `HTTP 200`.

- [ ] **Step 6: Stop the server**

`Ctrl-C` in the server terminal.

**Decision gate:** if any step above fails, do NOT proceed to Task 4 (Terraform). Fix locally first. The whole point of local dev is to catch issues before deploying.

---

## Task 4: Terraform — add LWA layer and env vars to `module "api"`

Goal: attach the LWA arm64 layer (version `:27`) and the two LWA env vars to the production `alexandria-api` Lambda. No other Terraform changes.

**Files:**
- Modify: `packages/infrastructure/functions.tf`

- [ ] **Step 1: Verify the LWA layer version 27 exists in the target region**

The region is `var.region` — read it from `packages/infrastructure/variables.tf` to know which region to query.

```bash
cat packages/infrastructure/variables.tf
```

Then (assuming the region is `eu-west-1` — substitute the actual value):
```bash
aws lambda list-layer-versions \
  --layer-name LambdaAdapterLayerArm64 \
  --region eu-west-1 \
  --query 'LayerVersions[?Version==`27`].[Version,LayerVersionArn]' \
  --output table
```
Expected: a row containing `27` and an ARN like `arn:aws:lambda:eu-west-1:753240598075:layer:LambdaAdapterLayerArm64:27`.

If version `:27` is not present in the region (very unlikely — AWS publishes to all standard regions), check available versions:
```bash
aws lambda list-layer-versions --layer-name LambdaAdapterLayerArm64 --region eu-west-1 \
  --query 'LayerVersions[].Version' --output text
```
…and pick the highest available version. Update the literal in Step 2 accordingly.

- [ ] **Step 2: Add LWA locals to `functions.tf`**

In `packages/infrastructure/functions.tf`, find the existing `locals` block at the top (lines 1–10):

```hcl
locals {
  apiFilename            = "../functions/api/dist/api.zip"
  indexerFilename        = "../functions/index-items/dist/indexer.zip"
  consistencyMgrFilename = "../functions/consistency-manager/dist/consistency-mgr.zip"
  userManagementFilename = "../functions/user-management/dist/user-management.zip"

  globalIndexFilename     = "global-index.tar.gz"
  sharedLibrariesFilename = "shared-libraries.json"
}
```

Use `Edit` to append two new keys inside the same `locals` block — change to:
```hcl
locals {
  apiFilename            = "../functions/api/dist/api.zip"
  indexerFilename        = "../functions/index-items/dist/indexer.zip"
  consistencyMgrFilename = "../functions/consistency-manager/dist/consistency-mgr.zip"
  userManagementFilename = "../functions/user-management/dist/user-management.zip"

  globalIndexFilename     = "global-index.tar.gz"
  sharedLibrariesFilename = "shared-libraries.json"

  # AWS Lambda Web Adapter (arm64) - publisher account 753240598075.
  # Bump intentionally; release notes:
  # https://github.com/aws/aws-lambda-web-adapter/releases
  lwa_layer_version = 27
  lwa_layer_arn     = "arn:aws:lambda:${var.region}:753240598075:layer:LambdaAdapterLayerArm64:${local.lwa_layer_version}"
}
```

- [ ] **Step 3: Attach the layer to `module "api"`**

In the same file, find `module "api"` (starts around line 12). Use `Edit` to add the `layers` argument right after `additional_policy_arns`:

Old:
```hcl
  additional_policy_arns = [aws_iam_policy.api.arn]

  zip = {
```

New:
```hcl
  additional_policy_arns = [aws_iam_policy.api.arn]

  # AWS Lambda Web Adapter (arm64). The layer's Extension intercepts the
  # Lambda runtime API and forwards events as HTTP requests to PORT.
  layers = [local.lwa_layer_arn]

  zip = {
```

- [ ] **Step 4: Add LWA env vars to `module "api"`**

In `module "api"`, find the `environment_variables` block. Use `Edit` to add `PORT` and `AWS_LWA_INVOKE_MODE` to the existing map.

Old:
```hcl
    SCRAPER_PROXY_API_KEY     = "alexandria.scraper.proxy.api.key"
    OCR_MODEL                 = var.ocr_model
  }
}
```

New:
```hcl
    SCRAPER_PROXY_API_KEY     = "alexandria.scraper.proxy.api.key"
    OCR_MODEL                 = var.ocr_model

    # AWS Lambda Web Adapter forwards events to this port on 127.0.0.1.
    # Must match the port the Gin server binds to in api/cmd/main.go.
    PORT                = "8080"
    AWS_LWA_INVOKE_MODE = "buffered"
  }
}
```

- [ ] **Step 5: Format and validate**

```bash
cd packages/infrastructure && terraform fmt
```
Expected: prints the path of any formatted file, or nothing if already well-formatted. Exit code 0.

```bash
cd packages/infrastructure && terraform validate
```
Expected: `Success! The configuration is valid.` Exit code 0.

- [ ] **Step 6: Suggested commit**

Confirm with the user, then:
```bash
git add packages/infrastructure/functions.tf
git commit -m "$(cat <<'EOF'
infra(api): attach AWS Lambda Web Adapter layer to alexandria-api

Adds the public LWA arm64 layer (v27, published by 753240598075) and
the two env vars LWA needs:
- PORT=8080 (where Gin binds inside the container)
- AWS_LWA_INVOKE_MODE=buffered (default; explicit for clarity)

Replaces the now-archived aws-lambda-go-api-proxy that the Go code
just dropped. API Gateway integration is unchanged.
EOF
)"
```

---

## Task 5: Deploy and verify

Goal: roll the changes to AWS and confirm the production API behaves identically.

**Preconditions for the engineer:**
- Tasks 1–4 are committed.
- AWS credentials for the deployment account are in the environment.

- [ ] **Step 1: Build and package the api zip**

```bash
cd packages/functions && make package-api
```
Expected: produces `packages/functions/api/dist/api.zip` containing the new `bootstrap` binary. Exit code 0.

Sanity check the binary timestamp matches your edits:
```bash
ls -la packages/functions/api/bin/bootstrap packages/functions/api/dist/api.zip
```

- [ ] **Step 2: `terraform plan`**

```bash
cd packages/infrastructure && terraform plan -out=lwa-migration.tfplan
```

Expected diffs — and **only** these — on `module.api.aws_lambda_function.this`:

1. `layers` changes from `[]` (or omitted) to `["arn:aws:lambda:<region>:753240598075:layer:LambdaAdapterLayerArm64:27"]`.
2. `environment.variables` gains two keys: `PORT = "8080"` and `AWS_LWA_INVOKE_MODE = "buffered"`. No other env vars change.
3. `source_code_hash` changes (new `bootstrap` binary).

If you see diffs on `api_trigger`, IAM, Cognito, any other lambda, or anything in `cloudfront.tf` / `s3.tf` — STOP and investigate. The migration should be purely additive on `alexandria-api`.

If the plan looks clean, save it (already done via `-out=`).

- [ ] **Step 3: `terraform apply` — user runs this themselves**

Hand the plan to the user:
> Plan saved to `packages/infrastructure/lwa-migration.tfplan`. The expected diffs are limited to `module.api.aws_lambda_function.this` (layer + 2 env vars + code hash). Apply with:
> ```bash
> cd packages/infrastructure && terraform apply lwa-migration.tfplan
> ```
> Per your global rule, I won't run apply for you — let me know once it's done so I can run the post-deploy checks.

Wait for the user to confirm apply succeeded before continuing.

- [ ] **Step 4: Post-deploy verification — read paths**

Get the API GW endpoint URL (either from a recent Terraform output, from `cloudfront.tf`, or from `aws apigatewayv2 get-apis`). Substitute it as `<API_URL>` below, and use the **same dev JWT pattern** from Task 3 (Step 3) — or, if testing prod, a prod-pool JWT.

```bash
curl -sS -w "\nHTTP %{http_code}\n" \
  -H "Authorization: Bearer <JWT>" \
  <API_URL>/v1/libraries
```
Expected: `HTTP 200`, valid JSON body. Same shape as pre-migration.

```bash
curl -sS -w "\nHTTP %{http_code}\n" \
  -H "Authorization: Bearer <JWT>" \
  "<API_URL>/v1/libraries/<libraryId>/items?limit=10"
```
Expected: `HTTP 200`, paginated items.

```bash
curl -sS -w "\nHTTP %{http_code}\n" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"terms":["test"]}' \
  <API_URL>/v1/search
```
Expected: `HTTP 200`, search results (may be empty).

- [ ] **Step 5: Post-deploy verification — write path round-trip**

```bash
curl -sS -w "\nHTTP %{http_code}\n" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"name":"lwa-prod-smoke","description":"delete me"}' \
  <API_URL>/v1/libraries
```
Expected: `HTTP 201` with `{ "id": "...", ... }`.

```bash
curl -sS -w "\nHTTP %{http_code}\n" -X DELETE \
  -H "Authorization: Bearer <JWT>" \
  <API_URL>/v1/libraries/<id-from-create>
```
Expected: `HTTP 200`.

- [ ] **Step 6: CloudWatch checks**

```bash
aws logs tail /aws/lambda/alexandria-api --since 5m --region <region>
```
Look for:
- A cold-start log line like `Listening and serving HTTP on :8080` (or the Gin-mode equivalent at release mode — may just be `[GIN]` request lines).
- **No** `panic`, `connection refused`, or `dial tcp 127.0.0.1:8080: connect: connection refused` errors. The last one would indicate LWA forwarded before Gin bound the port — see spec risk row for the readiness-check mitigation.
- HTTP status codes on `[GIN]` lines matching what `curl` saw (200/201).

Spot-check latency:
```bash
aws logs filter-log-events \
  --log-group-name /aws/lambda/alexandria-api \
  --filter-pattern 'REPORT' \
  --max-items 20 \
  --region <region>
```
Look at `Duration` and `Billed Duration` — should be in the same ballpark as pre-migration (sample a few values from before the apply for comparison).

- [ ] **Step 7: Confirm web-client end-to-end**

Sign into the production web client (`https://alexandria.isnan.eu/`), browse libraries, create/delete a test library, run a search. Anything that breaks here is a regression — capture the failing request from devtools and triage against CloudWatch logs.

- [ ] **Step 8: Mark migration complete**

If everything is green: the LWA migration is done. No tag/release needed — git history is the record.

If anything is red: roll back with
```bash
cd packages/infrastructure && git revert <task-4-commit-sha> && terraform apply
```
The previous `bootstrap` binary (in `packages/functions/api/bin/`) is still on disk; rolling back the Terraform commit restores the prior `layers`/env config, and the unchanged `source_code_hash` means Lambda keeps the binary it already has loaded. Then investigate the failure mode and re-attempt.

---

## Self-review (against spec)

**Spec coverage check** (each section of the spec maps to at least one task):

| Spec section | Covered by |
|---|---|
| Problem / scope (only `api` lambda) | Task 1 (touches only `api/cmd/main.go`) |
| Goals 1–4 (drop proxy, add layer, local-runnable, preserve behavior) | Tasks 1, 2, 3, 4 |
| Architecture (before/after) | Task 4 (layer + env vars wire up LWA) |
| Code changes (main.go rewrite) | Task 1, Step 1 |
| Code changes (`go.mod` cleanup) | Task 1, Step 4 |
| Code changes (build pipeline unchanged) | Task 1, Step 5 verifies all four lambdas still build |
| Terraform changes (locals + `module "api"` diff) | Task 4, Steps 2–4 |
| Local development (`make run-api-local`, `.env.local.example`) | Task 2 |
| Rollout order (code → build → smoke → plan → apply) | Tasks 1 → 3 → 5 |
| Post-deploy verification checklist | Task 5, Steps 4–7 |
| Risk: layer not in region | Task 4, Step 1 |
| Risk: cold-start race | Task 5, Step 6 (CloudWatch error check) |

No spec section is uncovered.

**Placeholder scan:** no TBD/TODO/"add error handling"/"similar to Task N"/etc. Every code block is complete. Every command has an exact expected output.

**Type/name consistency:** the file path `packages/functions/api/cmd/main.go`, the Terraform locals `lwa_layer_version` / `lwa_layer_arn`, the env var names `PORT` / `AWS_LWA_INVOKE_MODE`, and the layer name `LambdaAdapterLayerArm64` are referenced identically across tasks.
