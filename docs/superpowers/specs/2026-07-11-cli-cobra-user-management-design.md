# Alexandria CLI — cobra migration & user management

## Goal

Rework the Alexandria admin CLI (`packages/cli`) to follow the meal-planner CLI
approach: a cobra-based command tree with a `cmd/` + `internal/` layout, a
noun-grouped command structure, and a meal-planner-style `users list` output
table. Primary focus is **user management** (commands + options + table); the
existing maintenance commands are ported to cobra as part of the migration.

## Decisions

| Topic | Decision |
| --- | --- |
| Migration scope | Full cobra migration — users management, plus `check-consistency` and `fix-thumbnails` ported to cobra commands. |
| User commands | `list`, `approve`, `unapprove`, `delete` (no `inspect`). |
| User identifier | App user ID (`custom:Id`). CLI resolves it to the Cognito username for Cognito operations. |
| `delete` scope | Full wipe: owned DynamoDB rows + cross-user orphan shares + S3 thumbnails + Cognito user. |
| `users list` table | meal-planner-minimal: `ID | NAME | APPROVED | CREATED AT`. |
| Orphan-share discovery | Full-table `Scan` filtered to `SHARED_LIBRARY` — acceptable at current scale. |
| Ported commands | Nested under a `data` group: `data check-consistency`, `data fix-thumbnails`. |
| Docs | Add `.claude/cli.md` mirroring meal-planner; reference it from project CLAUDE.md. |

## Directory layout

```
packages/cli/
├── main.go                # cmd.Execute()
├── go.mod / go.sum        # + github.com/spf13/cobra
├── Makefile               # build/clean/test/mod-* (meal-planner style, ldflags -s -w)
├── bin/ (gitignored)      # alexandria binary + config.json
├── cmd/
│   ├── root.go            # rootCmd "alexandria" + --config persistent flag
│   ├── users.go           # users: list | approve | unapprove | delete
│   ├── data.go            # data group parent command
│   ├── consistency.go     # data check-consistency (ported)
│   └── thumbnails.go      # data fix-thumbnails (ported)
└── internal/
    ├── config/            # JSON config loader
    ├── cognito/           # ListUsers, GetByID, SetApproval, DeleteUser
    ├── dynamodb/          # QueryByPK, scan helpers, ScanSharesBySource, DeleteItems
    └── s3/                # DeleteByPrefix (+ Head/Put reused by fix-thumbnails)
```

AWS SDK clients live in `internal/`. Command orchestration and domain logic
(consistency checks, thumbnail repair, delete-cascade) live in `cmd/*.go` — the
same split meal-planner uses (`internal/` = clients, `cmd/` = logic).

## Configuration

`bin/config.json` changes shape. New format:

```json
{
  "userPoolId": "eu-central-1_XXXXXXX",
  "region": "eu-central-1",
  "tableName": "alexandria",
  "bucketName": "<account-id>-alexandria-..."
}
```

- Old keys `alexandriaClientId` and `apiEndpoint` are dropped — the CLI talks to
  AWS directly and never used them.
- `region` is now explicit (`config.LoadDefaultConfig(ctx, config.WithRegion(region))`)
  instead of relying on ambient `AWS_REGION`.
- Loaded via `--config` (persistent flag), defaulting to `config.json` next to
  the binary, resolved in `PersistentPreRunE` on the root command.

AWS credentials continue to resolve via the standard SDK chain (env vars, shared
profile, instance role).

## Commands

### `users list`

`tabwriter` table, columns `ID | NAME | APPROVED | CREATED AT`:

- `ID` — `custom:Id`.
- `NAME` — the `name` attribute; if `email` is present and differs, render as
  `name (email)`; fall back to email, then username (federated users have a
  `google_<sub>` username).
- `APPROVED` — `yes`/`no` from `custom:Approved`.
- `CREATED AT` — `UserCreateDate`, RFC3339.

### `users approve <custom:Id>` / `users unapprove <custom:Id>`

1. Resolve the user by `custom:Id` (scan `ListUsers`). Error `unknown user: <id>`
   if not found.
2. `AdminUpdateUserAttributes` sets `custom:Approved` to `true`/`false` on the
   resolved Cognito username.
3. Print `User <name> has been approved/unapproved`.

### `users delete <custom:Id>`

Flags: `--dry-run`, `-f/--force`.

Flow:

1. **Resolve** the user by `custom:Id`. If not found in Cognito, warn and
   continue — orphaned DynamoDB/S3 data can still be cleaned. If found, capture
   the Cognito username for step 7.
2. **Owned rows** — `QueryByPK("owner#<id>")`. Covers `LIBRARY`, `COLLECTION`,
   `BOOK`, `VIDEO`, `EVENT`, and the `SHARED_LIBRARY` rows this user *received*.
   Count by entity type.
3. **Orphan shares** — full-table `Scan` filtered to `EntityType = SHARED_LIBRARY`
   and `SharedFromId = <id>`: `SHARED_LIBRARY` rows other users hold that point to
   this user's libraries.
4. **Report** — print user (name + id) and the per-entity-type breakdown, plus
   orphan-share count. `--dry-run` prints the detail and stops here.
5. **Confirm** — `[y/N]` prompt unless `--force`.
6. **S3** — delete every object under prefix `user/<id>/` (all item thumbnails
   for the user; thumbnails are keyed `user/<ownerId>/library/<libId>/item/<itemId>`).
7. **DynamoDB** — `BatchWriteItem` delete owned rows + orphan-share rows
   (25/batch, retry `UnprocessedItems`).
8. **Cognito** — `AdminDeleteUser` on the resolved username (skipped if the user
   was not found in step 1).

Order (S3 → DynamoDB → Cognito) is chosen so a mid-run failure leaves the command
re-runnable: the Cognito user (the lookup anchor) is removed last.

## Ported commands (`data` group)

`data check-consistency` and `data fix-thumbnails` keep **identical behavior and
flags** (`fix-thumbnails --dry-run`). Only changes:

- Invocation moves under `data` (`alexandria data check-consistency`).
- They read `region` / `tableName` / `bucketName` from the new config and build
  their clients from `internal/cognito`, `internal/dynamodb`, `internal/s3`.
- The heavy logic (consistency indexing/checks, thumbnail scan/fetch/upload)
  moves into `cmd/consistency.go` / `cmd/thumbnails.go`, using the shared
  `internal/` clients (new scan/head/put/query methods added there as needed).

## internal/ client surface

- `config`: `Load(path) (*Config, error)` → `{UserPoolID, Region, TableName, BucketName}`.
- `cognito`: `NewClient(ctx, region, userPoolID)`, `ListUsers`, `GetByID(id)`,
  `SetApproval(username, bool)`, `DeleteUser(username)`.
- `dynamodb`: `NewClient(ctx, region, tableName)`, `QueryByPK(pk)`,
  `ScanSharesBySource(ownerId)`, `ScanAll()` / typed scan helpers for
  consistency, `ScanItemsWithPictureUrl()` for thumbnails, `DeleteItems(items)`.
- `s3`: `NewClient(ctx, region, bucketName)`, `DeleteByPrefix(prefix)`,
  `HeadObject(key)`, `PutObject(...)` (thumbnail repair).

## Documentation

- Create `.claude/cli.md` mirroring `meal-planner/.claude/cli.md`: design,
  structure, configuration, authentication, command reference, task checklist.
- Reference it from `.claude/CLAUDE.md` (the existing "administrative CLI tool
  here: @../packages/cli" line).
- Update `.claude/backend.md` if the CLI's role description needs it.

## Out of scope

- No behavior change to `check-consistency` / `fix-thumbnails` beyond the cobra
  rewiring and config move.
- No new maintenance commands.
- No changes to backend Lambdas, Terraform, or the web client.

## Notes for implementation

- Module path stays `alexandria.isnan.eu/cli`.
- Binary name stays `alexandria`; `bin/` remains gitignored.
- Reuse meal-planner's `internal/` client code as the starting template, adapting
  key patterns (`owner#<id>`, `SHARED_LIBRARY`, `SharedFromId`, thumbnail S3 keys)
  to Alexandria's data model.
