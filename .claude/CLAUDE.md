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
- The UI is a React based application: @ui.md.
- The backend is AWS Lamdba written in Golang: @backend.md.
- Everything is deployed on AWS.
- The project is a monorepo based on yarn workspaces.
- This project relies on serverless framework 

## Instruction

- Update the backend.md or the uid.md according to the tasks