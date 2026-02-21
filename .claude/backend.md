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

Features:
- **Book detection**: ISBN-based lookup using Google Books, Babelio, and GoodReads resolvers
- **Video detection**: OCR-based title extraction (AWS Rekognition) + TMDB metadata lookup
- **Search**: Fuzzy search powered by Bluge library (see @search.md)
- **CRUD**: Libraries, Books, Videos, lending history

#### Video Detection Flow
1. Client sends base64 image or manual title
2. If image provided: Rekognition `DetectText` extracts title
3. TMDB API search by title returns movie candidates
4. Each candidate includes: title, summary, director, cast (top 5), year, duration, poster

**Configuration**: TMDB access token via SSM parameter `alexandria.tmdb.access.token`

It is written in Golang.

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

This function consumes the CRUD events from a DynamoDB stream, then indexes the data (books, videos, and libraries) and puts the index into a S3 bucket.
The indexes are in a format easily consumable by a search engine (used by the search endpoint).

Triggers on EntityType: `LIBRARY`, `BOOK`, `VIDEO`, `SHARED_LIBRARY`

It is written in Golang.

Related to the search feature: @search.md.

