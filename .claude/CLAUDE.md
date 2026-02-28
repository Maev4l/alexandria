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

- The UI is a React based application, see: @ui-v2.md.
- The backend is AWS Lamdba written in Golang, see @backend.md file
- Everything is deployed on AWS.
- The project is a monorepo based on yarn workspaces.
- In addition, there is an administrative CLI tool here: @../packages/cli

## Instructions

- Update the backend.md or the uid-v2.md according to the tasks

## Plan

- Create a new version of the existing front-end, in the folder @../packages/web-client-v2
- Track the progress in @ui-v2.md file in a dedicated section
- Use the legacy client, @../packages/web-client for feature reference, but NOT technical reference, we want to start from scratch
