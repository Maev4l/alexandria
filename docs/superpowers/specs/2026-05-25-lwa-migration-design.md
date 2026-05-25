# Migrate `api` Lambda from `aws-lambda-go-api-proxy` to AWS Lambda Web Adapter

**Status:** Design approved
**Date:** 2026-05-25
**Scope:** `packages/functions/api` only

## Problem

The `api` Lambda uses `github.com/awslabs/aws-lambda-go-api-proxy/gin` to bridge API Gateway HTTP API v2 events to a Gin router. The library is sunset; AWS now publishes and recommends [AWS Lambda Web Adapter (LWA)](https://github.com/aws/aws-lambda-web-adapter) as the supported way to run web frameworks on Lambda. LWA is distributed as a public Lambda Layer (or container sidecar) and lets the function run as a normal HTTP server with no code coupling to Lambda's runtime API.

### Deprecation evidence for `aws-lambda-go-api-proxy`

| Signal | Value |
|---|---|
| GitHub `archived` flag | **true** (formal sunset marker — no issues/PRs accepted) |
| Last commit pushed | 2024-12-11 (~17 months before this spec) |
| Releases ever published | 0 (only Git tags exist; `v0.16.1` is the last) |
| Open issues frozen at archive | 84 |

### Official-status evidence for AWS Lambda Web Adapter

| Signal | Evidence |
|---|---|
| GitHub org | `github.com/aws/aws-lambda-web-adapter` — official `aws` org (production-grade), not `awslabs` (experimental) |
| Repo state | `archived: false`, 2,693 stars, 29 releases, latest `v1.0.0` (Mar 2026), last push 2026-05-22 |
| AWS-hosted docs | Official user guide at `aws.github.io/aws-lambda-web-adapter/` |
| AWS-published layer | Public Lambda Layer published by AWS account `753240598075` across all standard regions |
| AWS-published image | `public.ecr.aws/awsguru/aws-lambda-adapter` under AWS's public ECR namespace |
| AWS reference examples | The `examples/gin-zip` reference (used as the basis of this spec) lives in the official AWS repo |

## Scope

Only the `api` Lambda is affected. The other three Go lambdas (`user-management`, `index-items`, `consistency-manager`) are event-driven (Cognito triggers, DynamoDB Streams) and never used the proxy library — they remain untouched.

The migration is bundled with a small ergonomics win: the rewritten `api/cmd/main.go` becomes a plain Gin HTTP server, runnable locally with `go run ./api/cmd`. No Lambda emulator needed.

## Goals

1. Remove `github.com/awslabs/aws-lambda-go-api-proxy` from `go.mod`.
2. Replace it with the LWA Lambda Layer (arm64).
3. Make the `api` lambda runnable locally as a standard HTTP server.
4. Preserve all existing behavior: routes, middleware order, auth, response shapes, API Gateway integration.

## Non-goals

- Moving the `api` Lambda to a container image. Image-based LWA is viable but out of scope for this migration.
- Touching the three event-driven Go lambdas.
- Introducing integration tests (none exist today; orthogonal initiative).
- LocalStack or any AWS-services stub for offline development. Local runs hit real AWS.

## Verified facts

- Only `packages/functions/api/cmd/main.go:15` imports `aws-lambda-go-api-proxy`.
- `handlers.TokenParser` reads the Bearer JWT from `c.Request.Header.Get("Authorization")` (`packages/functions/api/handlers/middlewares.go`). Auth does **not** rely on API Gateway request-context injection → migration is transparent at the auth layer.
- `github.com/Maev4l/terraform-modules//modules/lambda-function?ref=v1.7.1` already exposes `var.layers` (`list(string)`). No module bump required.
- LWA on zip works via the **Lambda Extension** mechanism: the layer installs `/opt/extensions/lambda-adapter`, which Lambda auto-loads. No `AWS_LAMBDA_EXEC_WRAPPER` needed.
- LWA layer ARN (arm64): `arn:aws:lambda:<region>:753240598075:layer:LambdaAdapterLayerArm64:27`. Account `753240598075` is AWS's public LWA publisher.

## Architecture

### Before

```
API GW HTTP API v2 (JWT authorizer)
  → invokes Lambda with events.APIGatewayV2HTTPRequest
  → main() calls lambda.Start(handler)
  → handler delegates to ginadapter.GinLambdaV2.ProxyWithContext()
  → adapter synthesizes a net/http request → Gin router
```

### After

```
API GW HTTP API v2 (JWT authorizer)            (unchanged)
  → invokes Lambda; LWA Extension on the layer intercepts the runtime API
  → LWA translates the event → real HTTP request on 127.0.0.1:$PORT
  → main() previously called gin.Engine.Run(":$PORT"); serves the request
  → LWA translates the response back to APIGatewayV2HTTPResponse
```

Consequences:

- Gin code is a normal HTTP server. `go run ./api/cmd` works locally; same binary, no Lambda emulation.
- The `init()` + global `ginLambda` pattern goes away. Wiring moves into `main()`.
- Deprecated proxy package and the synthetic-request shim disappear from the call path.
- Cold start adds a small one-time cost (extension spin-up + child-process readiness) — typically a few tens of ms. Negligible for this app's interactive UX.

## Code changes

### `packages/functions/api/cmd/main.go` — full rewrite

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
	ocr := bedrock.NewOCR(region, os.Getenv("OCR_MODEL"))

	s := services.NewServices(db, storage, idp, ocr)
	h := handlers.NewHTTPHandler(s)

	g := router.Group("/api/v1")
	g.Use(handlers.TokenParser())
	g.Use(handlers.IdentityLogger())
	g.Use(handlers.ApprovalChecker())

	// All existing route registrations remain bit-for-bit identical
	// to the current main.go. (Detection, libraries, items, books,
	// videos, collections, sharing, history, search.)
	// See current main.go for the canonical list.

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	_ = router.Run(":" + port)
}
```

### What disappears

- `import ginadapter "github.com/awslabs/aws-lambda-go-api-proxy/gin"`
- `import "github.com/aws/aws-lambda-go/events"`
- `import "github.com/aws/aws-lambda-go/lambda"`
- The `init()` function (logic merges into `main()`).
- `var ginLambda *ginadapter.GinLambdaV2`.
- The `handler(ctx, req)` adapter function.
- `lambda.Start(handler)`.

### What stays bit-for-bit identical

- Every route registration and middleware order.
- The `/api/v1` base path. API GW routes (`ANY /api/v1/libraries/{proxy+}`, etc.) still match.
- Handler signatures — they only depend on `*gin.Context`, never on Lambda events.
- All repository and service wiring.

### `go.mod`

- Remove `github.com/awslabs/aws-lambda-go-api-proxy v0.16.1`.
- Keep `github.com/aws/aws-lambda-go v1.47.0` — the three event-driven lambdas still need it.
- Run `go mod tidy` to flush transitive deps the proxy uniquely pulled in.

### Build pipeline

`packages/functions/Makefile` is unchanged. Still:

```makefile
GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o api/bin/bootstrap ./api/cmd
```

The output binary just happens to be an HTTP server instead of a Lambda handler. `provided.al2023` doesn't care what `bootstrap` does internally — it's the layer's Extension that intercepts events.

## Terraform changes

File: `packages/infrastructure/functions.tf`. Only `module "api"` is touched.

### LWA layer pinning (new locals)

```hcl
locals {
  # ... existing locals ...

  # AWS Lambda Web Adapter (arm64) - publisher account 753240598075.
  # Bump intentionally; check release notes at
  # https://github.com/aws/aws-lambda-web-adapter/releases
  lwa_layer_version = 27
  lwa_layer_arn     = "arn:aws:lambda:${var.region}:753240598075:layer:LambdaAdapterLayerArm64:${local.lwa_layer_version}"
}
```

### `module "api"` diff (additive)

```hcl
module "api" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-function?ref=v1.7.1"

  function_name = "alexandria-api"
  architecture  = "arm64"
  memory_size   = 128
  timeout       = 35

  additional_policy_arns = [aws_iam_policy.api.arn]

  layers = [local.lwa_layer_arn]   # NEW

  zip = {
    filename = local.apiFilename
    runtime  = "provided.al2023"   # unchanged
    handler  = "bootstrap"         # unchanged
    hash     = filebase64sha256("../functions/api/bin/bootstrap")
  }

  environment_variables = {
    # all existing variables unchanged
    DYNAMODB_TABLE_NAME       = aws_dynamodb_table.alexandria.name
    S3_PICTURES_BUCKET        = aws_s3_bucket.alexandria.id
    S3_INDEX_BUCKET           = aws_s3_bucket.alexandria.id
    REGION                    = var.region
    USER_POOL_ID              = aws_cognito_user_pool.alexandria_user_pool.id
    GLOBAL_INDEX_FILE_NAME    = local.globalIndexFilename
    SHARE_LIBRARIES_FILE_NAME = local.sharedLibrariesFilename
    LEK_SECRET_KEY            = "alexandria.lastevaluatedkey.secret"
    TMDB_ACCESS_TOKEN         = "alexandria.tmdb.access.token"
    SCRAPER_PROXY_API_KEY     = "alexandria.scraper.proxy.api.key"
    OCR_MODEL                 = var.ocr_model

    # NEW: LWA-specific
    PORT                = "8080"     # port the Go HTTP server binds to
    AWS_LWA_INVOKE_MODE = "buffered" # default; explicit for clarity (vs response_stream)
  }
}
```

### What does not change

- `module "api_trigger"`: API GW HTTP API v2, JWT authorizer, routes, integration. LWA is transparent to API GW.
- IAM policies, Cognito wiring, all other lambdas, the image-processor.
- `timeout = 35`. LWA forwards the request and waits on the HTTP response; Lambda's clock still bounds the whole interaction.

### Expected `terraform plan` shape

Diffs against `aws_lambda_function.alexandria-api`:

1. `layers` adds the LWA arm64 ARN (version 27).
2. `environment.variables` gains `PORT` and `AWS_LWA_INVOKE_MODE`.
3. Source code hash changes (new `bootstrap` binary).

No other diffs anywhere in the plan.

## Local development

### Running the API locally

From `packages/functions/`:

```bash
REGION=eu-west-1 \
USER_POOL_ID=<dev-pool-id> \
DYNAMODB_TABLE_NAME=alexandria-dev \
S3_PICTURES_BUCKET=alexandria-dev \
S3_INDEX_BUCKET=alexandria-dev \
GLOBAL_INDEX_FILE_NAME=global-index.tar.gz \
SHARE_LIBRARIES_FILE_NAME=shared-libraries.json \
LEK_SECRET_KEY=alexandria.lastevaluatedkey.secret \
TMDB_ACCESS_TOKEN=alexandria.tmdb.access.token \
SCRAPER_PROXY_API_KEY=alexandria.scraper.proxy.api.key \
OCR_MODEL=eu.anthropic.claude-haiku-4-5-20251001-v1:0 \
go run ./api/cmd
```

Server listens at `http://localhost:8080/api/v1/...`. AWS SDK calls pick up credentials from the shell environment (e.g. `aws sso login`), same way the Lambda picks up its execution-role credentials.

### Optional Makefile target

```makefile
# Run the API lambda locally as a plain HTTP server (Web Adapter mode).
# Requires AWS credentials in the environment (e.g. `aws sso login`)
# and env vars sourced from .env.local (gitignored).
run-api-local:
	@set -a && . ./api/.env.local && set +a && go run ./api/cmd
```

A gitignored `api/.env.local` keeps the long env list out of shell history. A committed `api/.env.local.example` template documents the required variables for new contributors.

### Hitting the local API with auth

`TokenParser` validates real Cognito JWTs against the configured `USER_POOL_ID`. Use a real dev-pool JWT (sign in via the dev web client, copy the `idToken` from devtools, send as `Authorization: Bearer <jwt>`). Do not add a "skip auth in dev" code path — code branches that exist only for local development violate the project's guidance against fallbacks that can't happen in prod.

## Rollout

Small blast radius (one lambda, additive Terraform diff). Single straight-line cutover — no canary, no parallel deployment.

### Order of operations

1. Code change — rewrite `api/cmd/main.go`, drop deprecated imports, `go mod tidy`.
2. Build locally — `make build-api package-api`. Confirm `bootstrap` binary is produced and zipped.
3. Local smoke test — `go run ./api/cmd`, hit `GET /api/v1/libraries` with a real dev-pool JWT, confirm 200 + JSON response. Proves the new code path before touching AWS.
4. `terraform plan` — confirm only the expected diffs on `alexandria-api`: `layers`, two env vars, code hash.
5. `terraform apply` — in-place function update. No API GW changes.
6. Post-deploy verification (below). On failure: `terraform apply` the previous commit. Single-step rollback since no schema/auth changes.

### Post-deploy verification checklist

Exercise representative routes from the production web client:

- `GET /api/v1/libraries` — list (read path, JWT auth).
- `POST /api/v1/libraries` — create (write path, JSON body parsing).
- `GET /api/v1/libraries/{id}/items?limit=10` — paginated read (query params + LEK encryption).
- `POST /api/v1/search` — search (Bluge index loaded from S3).
- `POST /api/v1/detections` with a real ISBN — external HTTP calls work.
- A route returning a 4xx validation error — confirm error response shape unchanged (LWA preserves status + body).

CloudWatch checks:

- Cold-start log line shows the Gin server starting (e.g. `Listening and serving HTTP on :8080`).
- No `panic` or `connection refused` errors (would indicate LWA forwarded before Gin bound the port — unlikely at 128MB but worth confirming on first cold start).
- p50 / p99 latency roughly unchanged vs. pre-migration baseline.

### Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| LWA layer version `:27` not available in the deployed region | Low | Verify with `aws lambda list-layer-versions --layer-name LambdaAdapterLayerArm64 --region <region>` before applying. AWS publishes to all standard regions. |
| Cold-start race: LWA forwards before Gin listens on `:8080` | Very low at 128MB on arm64 | If observed: add `AWS_LWA_READINESS_CHECK_PATH=/health` env var + a `GET /health` route in Gin returning 200. Not included by default — YAGNI. |
| Memory creep from running the LWA extension | Low (~10 MB) | Function is at 128 MB; bump to 192 MB if RSS climbs. Measure post-deploy first. |
| Lost behavior in the proxy library's request synthesis (e.g. how it encodes path params) | Low | Smoke-test the full route set (step 3 above). Handler signatures depend only on `*gin.Context`, so behavioral parity is high. |

## Open questions

None at the time of writing. The LWA layer version (`:27`) is pinned per current release.
