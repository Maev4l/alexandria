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
- **CRUD**: Libraries, Books, Videos, Collections, lending history

#### Video Detection Flow

1. Client sends base64 image or manual title
2. If image provided: Rekognition `DetectText` extracts title
3. TMDB API search by title returns movie candidates
4. Each candidate includes: title, summary, director, cast (top 5), year, duration, poster

**Configuration**: TMDB access token via SSM parameter `alexandria.tmdb.access.token`

It is written in Golang.

### User management

Source code: @../packages/functions/user-management

New users that want to signup must be approved by an application admin. The admins are aware of the pending approval via Slack notifications.
This function is wired with a new user signup event in Cognito, so it sends an SNS notification, that is relayed by an external system (not depicted in this project) to a Slack channel.

It is written in Golang.

### Image processor

Source code: @../packages/functions/images-processing

This function resizes the book covers uploaded by the user in a S3 bucket, and convert the image in webp format.

It relies on the sharp library and is deployed as a Docker Container.

### Consistency-manager

Source code: @../packages/functions/consistency-manager

This function ensures the data in the DynamoDB table are consistent by consuming the CRUD events posted in a DynamoDB stream.

Triggers on:

- MODIFY: `LIBRARY`, `COLLECTION` - propagates name changes to items
- REMOVE: `COLLECTION` - orphans items (sets CollectionId/Name/Order to NULL)

It is written in Golang.

### Indexer

Source code: @../packages/functions/index-items

This function consumes the CRUD events from a DynamoDB stream, then indexes the data (books, videos, and libraries) and puts the index into a S3 bucket.
The indexes are in a format easily consumable by a search engine (used by the search endpoint).

Triggers on EntityType: `LIBRARY`, `BOOK`, `VIDEO`, `SHARED_LIBRARY`

It is written in Golang.

Related to the search feature: @search.md.

## Infrastructure

The infrastrucuture is hosted on AWS and everything is deployed via Terraform @../packages/infrastrucure

## Code Improvements Backlog

### Critical Issues

| Issue                           | Location                                               | Impact                                                            |
| ------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| **Global mutable state**        | `api/services/lookup_book.go:12`, `lookup_video.go:13` | Thread safety, untestable resolvers                               |
| **Silent errors in unmarshal**  | `api/repositories/dynamodb/items.go:135,619`           | Data corruption risk - logs warning but uses uninitialized record |
| **`context.TODO()` everywhere** | All DynamoDB/S3 calls                                  | No timeout propagation, requests can hang indefinitely            |
| **Generic error messages**      | All handlers                                           | Same message for all failures makes debugging hard                |

### Code Duplication (~200 lines recoverable)

| Pattern                          | Locations                                                              | Fix                                              |
| -------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------ |
| Request binding (6 lines each)   | 10 handlers in `items.go`, `libraries.go`, `detection.go`, `search.go` | Extract `bindJSON[T]()` middleware               |
| Item response building           | `items.go:520-553`, `search.go:42-75`                                  | Extract `buildItemResponse()` helper             |
| Collection/Order normalization   | `items.go:197-205`, `288-296`, `359-367`, `432-440`                    | Extract `normalizeCollectionOrder()`             |
| DynamoDB record → domain mapping | `items.go:253-282`, `313-340`, `616-645`                               | Extract `mapPersistenceItemToDomain()`           |
| Resolver orchestration           | `lookup_book.go`, `lookup_video.go` (80% identical)                    | Generic `ResolveParallel[T]()` using Go generics |

### Go Best Practices

| Issue                         | Locations                                                                                             | Recommendation                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Magic numbers                 | `items.go:45-46` (order 1-1000), `items.go:150` (page size 20), `index-items/main.go:222` (batch 100) | Define constants: `MinCollectionOrder`, `MaxCollectionOrder`, `MaxPageSize`, `IndexBatchSize` |
| Deferred close ignores errors | Multiple `defer func() { _ = reader.Close() }()`                                                      | Log close errors: `if err := reader.Close(); err != nil { log.Error()... }`                   |
| Missing nil checks            | Inconsistent across handlers                                                                          | Apply consistently before pointer dereference                                                 |
| Error wrapping loses context  | `services/libraries.go:14-17`                                                                         | Use `fmt.Errorf("getting library: %w", err)`                                                  |
| Missing tests                 | No unit tests found                                                                                   | Add test infrastructure with mocks for ports                                                  |

### API Consistency Issues

| Issue                         | Details                                                                |
| ----------------------------- | ---------------------------------------------------------------------- |
| Mixed null/optional handling  | `Picture` (base64) vs `PictureUrl` represent same concept differently  |
| Collection/Order invariant    | Both required if either set, but validation only at handler level      |
| Inconsistent pagination token | Internal `continuationToken` vs API `nextToken`                        |
| Video field optionality       | `ReleaseYear`/`Duration` non-optional in models but optional in domain |

### Prioritized Action Items

**Week 1 (Critical):**

- [ ] Fix `LibrayName` → `LibraryName` typo (coordinate with frontend)
- [ ] Refactor resolvers to inject via DI instead of global `init()`
- [ ] Extract request binding middleware
- [ ] Propagate `context.Context` through repository layer

**Week 2 (Quality):**

- [ ] Create custom error types (`NotFoundError`, `ValidationError`)
- [ ] Extract duplicate item response building
- [ ] Define constants for magic numbers
- [ ] Fix silent error handling in unmarshal

**Week 3 (Testing):**

- [ ] Add mock implementations for ports
- [ ] Unit tests for handlers (validation, error paths)
- [ ] Unit tests for services (business logic)
- [ ] Integration tests for sharing flow

### DynamoDB Data Model

#### Schema Overview

Single table `alexandria` with composite primary key + 2 GSIs:

```
Table: alexandria
├── PK (Hash)     - Partition key
├── SK (Range)    - Sort key
├── GSI1 (GSI1PK, GSI1SK) - Query-focused
└── GSI2 (GSI2PK, GSI2SK) - Owner-wide searches
```

#### Entity Key Patterns

| Entity         | PK                    | SK                                              | GSI1PK                                          | GSI1SK                              |
| -------------- | --------------------- | ----------------------------------------------- | ----------------------------------------------- | ----------------------------------- |
| LIBRARY        | `owner#<ownerId>`     | `library#<libraryId>`                           | `owner#<ownerId>`                               | `library#<name>`                    |
| COLLECTION     | `owner#<ownerId>`     | `library#<libId>#collection#<collectionId>`     | `owner#<ownerId>#library#<libId>`               | `collection#<name>`                 |
| LIBRARY_ITEM   | `owner#<ownerId>`     | `library#<libId>#item#<itemId>`                 | `owner#<ownerId>#library#<libId>`               | `item#<collection>#<order>#<title>` |
| SHARED_LIBRARY | `owner#<recipientId>` | `shared-library#<libraryId>`                    | -                                               | -                                   |
| ITEM_EVENT     | `owner#<ownerId>`     | `library#<libId>#item#<itemId>#event#<ISO8601>` | `owner#<ownerId>#library#<libId>#item#<itemId>` | `event#<ISO8601>`                   |

#### GSI1SK Complexity

`persistence/models.go:93-100`: Sort key format varies based on collection/order presence:

- With collection: `item#<collection>#<order_padded_5digits>#<title>`
- Without: `item#<title>`

#### Denormalization (Intentional)

| Field                 | Duplicated In                         | Updated By                 |
| --------------------- | ------------------------------------- | -------------------------- |
| `LibraryName`         | Every LIBRARY_ITEM                    | consistency-manager stream |
| `CollectionName`      | Every LIBRARY_ITEM in collection      | consistency-manager stream |
| `OwnerName`/`OwnerId` | LIBRARY, LIBRARY_ITEM, SHARED_LIBRARY | consistency-manager stream |
| GSI1SK/GSI2SK         | Computed on write                     | Repository layer           |

#### Eventual Consistency Windows

| Operation         | Lag                                   | Reason                                       |
| ----------------- | ------------------------------------- | -------------------------------------------- |
| Library rename    | ~100ms                                | consistency-manager updates items via stream |
| Collection rename | ~100ms                                | consistency-manager updates items via stream |
| Collection delete | ~100ms                                | consistency-manager orphans items via stream |
| New item          | ~100ms                                | indexer updates Bluge index via stream       |
| Share/unshare     | Immediate (DynamoDB), ~100ms (search) | Async S3 manifest update                     |

#### DynamoDB Issues

| Issue                             | Location                                   | Impact                                           | Fix                                                                                            |
| --------------------------------- | ------------------------------------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| **Typo: `TypSharedLibrary`**      | `persistence/models.go:12`                 | Inconsistent naming                              | Rename to `TypeSharedLibrary`                                                                  |
| ~~**Delete queries main table**~~ | `libraries.go:63`                          | ~~Full PK scan instead of GSI1~~                 | ✅ Correct: main table is optimal (single PK, SK prefix matches all). See optimizations below. |
| **Read-modify-write race**        | `UnshareLibrary` in `libraries.go:302-350` | Concurrent unshare can lose updates              | Use SET expressions directly                                                                   |
| ~~**Negative order allowed**~~    | `persistence.go:72`                        | ~~`*int` allows -1, breaks `%05d` padding sort~~ | ✅ Fixed: validation now enforces 1-1000                                                       |
| **Encrypted pagination tokens**   | `items.go:33-100`                          | AES-GCM overhead per page                        | Consider plain base64 if internal-only                                                         |
| **Manual batch chunking**         | `libraries.go:114`                         | Unnecessary - SDK handles batching               | Remove `slices.ChunkBy`                                                                        |

#### Recommendations

**Schema:**

- Document all key patterns in a single reference file
- Add validation at domain level for collection/order invariant
- Consider splitting `LIBRARY_ITEM` if video attributes diverge significantly

**Performance:**

- Measure encrypted token overhead vs security benefit
- Consider caching owner metadata (static after creation)

**DeleteLibrary optimizations** (`libraries.go:58-129`):

- Add `ProjectionExpression: "PK, SK"` to reduce data transfer (currently fetches all attributes)
- Handle `UnprocessedItems` in BatchWriteItem response with retry logic
- Remove `slices.ChunkBy(records, 25)` - redundant since query already uses `Limit: 25`

## Migrations

### Collections Migration

Source code: @../packages/migrations/collections

CLI tool to convert legacy `Collection` string attribute on items to first-class COLLECTION entities.

**What it does:**

1. Scans all BOOK/VIDEO items with `Collection` attribute
2. Groups by (ownerId, libraryId, collectionName)
3. Creates COLLECTION entities with unique IDs
4. Updates items with `CollectionId` and `CollectionName`

**Usage:**

```bash
cd packages/migrations/collections
make dry-run TABLE=alexandria          # Preview changes
make run TABLE=alexandria              # Execute migration
```

**Flags:**

- `--table`: DynamoDB table name (required)
- `--region`: AWS region (default: eu-central-1)
- `--dry-run`: Preview mode, no writes
