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

## Architecture

Architecture diagram, see: @../documentation/architecture.jpg (or @../documentation/architecture.drawio)

## Design

- The UI is a React based application.
  - **v3 — in production**, see: @ui-v3.md (source: @../packages/web-client-v3).
    Its visual system is @../packages/web-client-v3/DESIGN.md ("The Noir Imprint").
    Every `frontend-*` Make target builds, serves and deploys v3.
  - **v2 — retired, source retained**, see: @ui-v2.md (source: @../packages/web-client-v2).
    v3 replaced it at `alexandria.isnan.eu`; there is one bucket and one distribution, so the
    deploy that shipped v3 removed v2. Nothing builds or deploys v2 any more — use
    `yarn --cwd packages/web-client-v2 build|dev` deliberately if you need it. It remains an
    explicit ANTI-reference for v3's identity, and a working reference for what the API returns.
- Durable product truth (users, purpose, constraints, API limits) lives in @../PRODUCT.md
- The backend is AWS Lamdba written in Golang, see @backend.md file
- Everything is deployed on AWS.
- The project is a monorepo. Each JS package installs independently via `yarn --cwd <package>` (no yarn workspaces; one `yarn.lock` per package).
- In addition, there is an administrative CLI tool, see: @cli.md (source: @../packages/cli)

## Instructions

- Update backend.md, ui-v2.md or ui-v3.md according to the tasks
- Front-end work on v3 must also keep @../packages/web-client-v3/DESIGN.md true to what shipped

## Plan

- Track v2 progress in @ui-v2.md, and v3 progress in @ui-v3.md, each in a dedicated section
