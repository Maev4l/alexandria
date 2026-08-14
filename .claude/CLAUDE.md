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
  - **v2 — in production**, see: @ui-v2.md (source: @../packages/web-client-v2)
  - **v3 — specified, not yet built**, see: @ui-v3.md (source: @../packages/web-client-v3).
    A from-scratch replacement. Its visual system is @../packages/web-client-v3/DESIGN.md
    ("The Noir Imprint"). v2 is an explicit anti-reference for v3, not a starting point.
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
