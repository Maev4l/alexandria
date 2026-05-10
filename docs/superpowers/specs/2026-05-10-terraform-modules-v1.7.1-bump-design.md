# Terraform Modules v1.6.0 → v1.7.1 Bump

**Date:** 2026-05-10
**Scope:** `packages/infrastructure/functions.tf`

## Goal

Bump `github.com/Maev4l/terraform-modules` from `v1.6.0` to `v1.7.1` for all module references and migrate the one module that has a breaking signature change (`lambda-trigger-apigw`).

## Context

`packages/infrastructure/functions.tf` is the only file with `terraform-modules` references — 9 module instances at `v1.6.0`:

| Module | Instances |
|---|---|
| `lambda-function` | 5 (`api`, `indexer`, `consistency_manager`, `user_management`, `image_processor`) |
| `lambda-trigger-dynamodb` | 2 (`indexer_trigger`, `consistency_manager_trigger`) |
| `lambda-trigger-apigw` | 1 (`api_trigger`) |
| `lambda-trigger-cognito` | 1 (`user_management_trigger`) |
| `lambda-trigger-s3` | 1 (`image_processor_trigger`) |

## Upstream changes between v1.6.0 and v1.7.1

Two commits:

| Tag | Change | Impact on this project |
|---|---|---|
| v1.7.0 (Apr 18 2026) | "Allow multiple lambdas integration with a single API gateway" — rewrites `lambda-trigger-apigw` | **Breaking** — `api_trigger` config must be rewritten |
| v1.7.1 (May 3 2026) | "Enable force delete flag for S3 bucket" — affects an S3 bucket module | None — project uses raw `aws_s3_bucket` resources, not the custom module |

All other modules used by this project (`lambda-function`, `lambda-trigger-dynamodb`, `lambda-trigger-cognito`, `lambda-trigger-s3`) are unchanged between v1.6.0 and v1.7.1.

## Design

### 1. Version bump (8 of 9 modules — pure string replace)

```diff
-?ref=v1.6.0
+?ref=v1.7.1
```

Applies to: `api`, `indexer`, `indexer_trigger`, `consistency_manager`, `consistency_manager_trigger`, `user_management`, `user_management_trigger`, `image_processor`, `image_processor_trigger`.

No signature changes; no plan diff expected on these.

### 2. Rewrite `module "api_trigger"`

#### Signature change

| v1.6.0 | v1.7.1 |
|---|---|
| `function_name`, `function_arn`, `invoke_arn`, `routes` as flat top-level inputs | Wrapped in a single `integrations` map (multi-Lambda support) |
| `api_name` auto-derived as `"<function_name>-http-api"` | `api_name` is now an explicit required input |
| Other inputs (`authorizer`, `cors`, `disable_execute_api_endpoint`, `stage_name`, `custom_domain`, `tags`) | Unchanged |

#### New block

```hcl
module "api_trigger" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-apigw?ref=v1.7.1"

  # The v1.7.1 module appends "-http-api" to api_name. Passing
  # "alexandria-api" reproduces v1.6.0's auto-derived name and keeps
  # aws_apigatewayv2_api.this stable in place.
  api_name = "alexandria-api"

  cors                         = false
  disable_execute_api_endpoint = false

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

Integration key `"api"` matches the module instance name; future Lambdas can be added as additional entries in the map.

### 3. State impact (destroy/recreate accepted)

Inside `module.api_trigger`:

| Resource | Old address | New address | Action |
|---|---|---|---|
| HTTP API | `aws_apigatewayv2_api.this` | `aws_apigatewayv2_api.this` | No-op (same address, same `name` attribute) |
| Authorizer | `aws_apigatewayv2_authorizer.this` | `aws_apigatewayv2_authorizer.this` | No-op |
| Integration | `aws_apigatewayv2_integration.this` | `aws_apigatewayv2_integration.this["api"]` | Destroy + recreate |
| Route ×5 | `aws_apigatewayv2_route.this["<METHOD path>"]` | `aws_apigatewayv2_route.this["api:<METHOD path>"]` | Destroy + recreate |
| Lambda permission | `aws_lambda_permission.this` | `aws_lambda_permission.this["api"]` | Destroy + recreate |

The HTTP API itself, the authorizer, and the custom-domain mapping (managed outside this module via Cognito/Route53/CloudFront) are not touched.

Expected outage: brief window (seconds to ~1 min) while integration/routes are absent during `terraform apply`. Acceptable per project decision.

## Verification

1. `terraform init -upgrade` — re-pulls modules at v1.7.1.
2. `terraform plan` — confirm:
   - Only `module.api_trigger.{integration, route×5, lambda_permission}` show destroy/create.
   - The 8 other modules show no diff.
   - `aws_apigatewayv2_api.this` and `aws_apigatewayv2_authorizer.this` show no diff.
3. `terraform apply` during a low-traffic window.
4. Smoke-test the API: hit one authenticated endpoint via the frontend or curl.

## Out of scope

- `force_destroy` flag on v1.7.1's S3 bucket module — project uses raw `aws_s3_bucket` resources in `s3.tf` and `webclient.tf`, not the custom module.
- No code changes outside `packages/infrastructure/functions.tf`.
- No `moved` blocks (zero-downtime migration explicitly declined in favor of simpler diff).
