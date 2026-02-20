# Alexandria Backend

## Design

Source code: @../packages/functions (and subfolders)

The backend consists a set of AWS Lambda functions, that are detailed below.
Authentication relies on AWS Cognito.
Regarding the data persistence:
 - DynamoDB for the main entities
 - S3 buckets for thumbnails and search index

### API
Source code: @../packages/functions/api
OpenAPI spec: @../packages/functions/api/openapi.yaml

This function exposes the core HTTP APIS behind and AWS API Gateway.
In addition, it exposes a search endpoint that allows a fuzzy search. This search functionality is based on the "bluge" library.

It is written in Golang.

Related to the search feature: @search.md

### Onboarding users
Source code: @../packages/functions/onboard-users

New users that want to signup must be approved by an application admin. The admins are aware of the pending approval via Slack notifications.
This function is wired with a new user signup event in Cognito, so it sends an SNS notification, that is relayed by an external system (not depicted in this project) to a Slack channel.

It is written in Golang.

### Image processor
Source code: @../packages/functions/images-processing

This function resizes the book covers uploaded by the user in a S3 bucket, and convert the image in webp format.

It relies on the sharp library and is deployed as a Docker Container.

### Consistency-manager
Source code: @../packages/functions/consistency-manager

This function ensures the data in the DynamoDB table are consistent by consuming the CRUD events posted in a DynamoB stream.

It is written in Golang.

### Indexer
Source code: @../packages/functions/index-items

This function consumes the CRUD events from a DynamoDB stream, then indexes the data (books and library) and put the index into a S3 bucket.
The indexes are in a format easily consumable by a search engine (used by the search endpoint).

It is written in Golang.

Related to the search feature: @search.md.

