# Project Alexandria

This application allows users to manage their libraries and their books.
Users can (not exhaustive list):

- Manage their libraries:
  - CRUD operations
  - Share their libraries and the according content with other users (in read only mode)
- Managed books in these libraries
  - CRUD operations
  - Group books together in the same collections
  - Manage book lending and their retuns

## Where the documentation lives

These paths are deliberately NOT `@`-imported: an import loads the whole file into every session,
and together they weigh ~260 KB. Read the one the task touches, and only the section you need.

| Topic | File |
|---|---|
| Product truth (users, purpose, constraints, API limits) | `PRODUCT.md` |
| Web client v3 (in production) — UX, IA, routes, screens | `.claude/ui-v3.md` |
| Web client v3 — visual system ("The Noir Imprint") | `packages/web-client-v3/DESIGN.md` |
| Backend (Go Lambdas, DynamoDB model) | `.claude/backend.md` |
| API contract — grep it for the endpoint you need, never read it whole | `packages/functions/api/openapi.yaml` |
| Authentication (Cognito, Google OAuth, linking, approval) | `.claude/authn-scheme.md` |
| Search | `.claude/search.md` |
| Admin CLI | `.claude/cli.md` |
| Web client v2 (retired reference only) | `.claude/ui-v2.md` |
| Architecture diagram | `documentation/architecture.jpg` (or `.drawio`) |

Front-end work on v3 also picks up `packages/web-client-v3/CLAUDE.md`, which maps those two
documents section by section.

## Design

- The UI is a React based application.
  - **v3 — in production** (source: `packages/web-client-v3`).
    Every `frontend-*` Make target builds, serves and deploys v3.
  - **v2 — retired, source retained** (source: `packages/web-client-v2`).
    v3 replaced it at `alexandria.isnan.eu`; there is one bucket and one distribution, so the
    deploy that shipped v3 removed v2. Nothing builds or deploys v2 any more — use
    `yarn --cwd packages/web-client-v2 build|dev` deliberately if you need it. It remains an
    explicit ANTI-reference for v3's identity, and a working reference for what the API returns.
- The backend is AWS Lambda written in Golang.
- Everything is deployed on AWS.
- The project is a monorepo. Each JS package installs independently via `yarn --cwd <package>` (no yarn workspaces; one `yarn.lock` per package).
- In addition, there is an administrative CLI tool (source: `packages/cli`).

## Instructions

- Update `.claude/backend.md`, `.claude/ui-v2.md` or `.claude/ui-v3.md` according to the tasks
- Front-end work on v3 must also keep `packages/web-client-v3/DESIGN.md` true to what shipped
- Never turn a path in these documents back into an `@` import unless the file is small and
  every task needs it

## Plan

- Track v2 progress in `.claude/ui-v2.md`, and v3 progress in `.claude/ui-v3.md`, each in a dedicated section
