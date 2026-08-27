# Alexandria CLI

## Design

- Source code: @../packages/cli
- Admin CLI written in Golang, using cobra
- Built for the current platform (not Lambda)
- Config from JSON file (`--config`, defaults to `config.json` next to binary)
- Uses AWS IAM credentials (env vars, AWS profile, or instance role)

## Structure

- `cmd/root.go` — root command with `--config` persistent flag
- `cmd/users.go` — users subcommands (list, approve, unapprove, delete)
- `cmd/data.go` — `data` group parent
- `cmd/consistency.go` — `data check-consistency`
- `cmd/thumbnails.go` — `data fix-thumbnails`
- `internal/config/` — config loader (userPoolId, region, tableName, bucketName)
- `internal/cognito/` — Cognito client (ListUsers, GetByID, SetApproval, DeleteUser)
- `internal/dynamodb/` — DynamoDB client (QueryByPK, Scan, DeleteItems)
- `internal/s3/` — S3 client (DeleteByPrefix, HeadObject, HeadObjectMetadata, PutObject, CopyObject)

## Configuration

```json
{
  "userPoolId": "Cognito user pool ID (e.g. eu-central-1_XXXXXXX)",
  "region": "AWS region (e.g. eu-central-1)",
  "tableName": "DynamoDB table name (e.g. alexandria)",
  "bucketName": "S3 bucket for thumbnails (e.g. <account-id>-alexandria-...)"
}
```

## Authentication

AWS IAM credentials via the standard SDK chain: env vars, `~/.aws/credentials`, or instance role.

## Commands

### Users

Users are identified on the command line by their app user ID (`custom:Id`); the
CLI resolves it to the Cognito username internally.

- `users list` — lists users (ID, NAME, APPROVED, CREATED AT) from Cognito
- `users approve <id>` — set custom:Approved = true
- `users unapprove <id>` — set custom:Approved = false
- `users delete <id>` — remove ALL data for the user: owned DynamoDB rows
  (`owner#<id>`), cross-user SHARED_LIBRARY rows pointing to the user's libraries,
  S3 thumbnails under `user/<id>/`, and the Cognito user
  - `--dry-run` — show what would be deleted without making changes
  - `-f, --force` — skip confirmation prompt

### Data

- `data check-consistency` — cross-check DynamoDB rows against Cognito users and
  denormalized fields; reports orphans, count mismatches, and drift
- `data fix-thumbnails` — detect items whose thumbnails are missing from S3 and
  re-queue them from their source PictureUrl
  - `--dry-run` — show what would be changed without making changes
- `data reencode-thumbnails` — re-queue *existing* thumbnails through the image processor
  so ones written before the pipeline switched to lossy WebP are re-encoded. Copies the
  stored thumbnail server-side into `incoming/<itemId>`; it never re-fetches PictureUrl,
  because external sources rot (one sampled publisher URL still answers 200 while serving
  a 244-byte HTML page, so re-fetching would destroy a cover we still hold intact).
  - `--dry-run` — show what would be re-encoded without making changes
  - Skips any thumbnail already carrying the image processor's `encode` metadata marker, so
    it is safe to re-run, resumes after an interruption, and **re-running it is how you
    verify a previous run** — everything queued should come back as already lossy.
  - The image processor must be deployed with the lossy setting *first*, or every object is
    re-encoded losslessly again and nothing changes.
  - Afterwards, invalidate `/thumbnails/*` on the CloudFront distribution; the objects are
    served `immutable, max-age=604800` keyed on `?v={updatedAt}`, which this deliberately
    does not bump (bumping it would rewrite every item row and ripple through the
    consistency-manager and indexer streams to change a byte count).

## Tasks

- [x] Migrate CLI to cobra (`cmd/` + `internal/` layout)
- [x] `users list` (meal-planner-style table)
- [x] `users approve` / `users unapprove` (by custom:Id)
- [x] `users delete` with full data cascade + `--dry-run` / `--force`
- [x] Port `check-consistency` under `data`
- [x] Port `fix-thumbnails` under `data`
- [x] `data reencode-thumbnails` — lossless → lossy WebP migration for the back-catalogue
