# Alexandria Search Architecture

## Implementation Status: DONE

## Solution: Pre-built Global Index with Access Filtering

Build a single global Bluge index containing **all items** with ownership metadata. Store it in S3. At search time, load the pre-built index and filter by access rights.

### Document Structure

Each indexed document includes:
- **Text fields** (fuzzy searchable): `title`, `authors`, `collection`
- **Keyword fields** (exact match for filtering): `ownerId`, `libraryId`

### Search Query Logic

Combine fuzzy text search with access filtering:

1. **Text query**: Fuzzy match on `title`, `authors`, `collection`
2. **Access filter**: `ownerId = currentUser` OR `(ownerId, libraryId) IN sharedLibraries`
3. **Final query**: text query AND access filter

### S3 Structure

```
indexes/
  global-index.tar.gz       ← pre-built Bluge index (all items)
  shared-libraries.json     ← sharedToId → [sharedLibraries] mapping
```

### shared-libraries.json Structure

Map keyed by `sharedToId` (recipient user) for O(1) lookup at search time:

```json
{
  "<sharedToId (userId)>": [
    { "ownerId": "<owner userId>", "libraryId": "<libraryId>" }
  ]
}
```

Event handling:
- **INSERT**: Append entry to `sharedLibrariesMap[sharedToId]`
- **REMOVE**: Filter out entry from `sharedLibrariesMap[sharedToId]` by libraryId

### Event-Driven Updates

| Event | Action |
|-------|--------|
| Book created | Rebuild global index |
| Book updated | Rebuild global index |
| Book deleted | Rebuild global index |
| Library shared | Update `shared-libraries.json` only |
| Library unshared | Update `shared-libraries.json` only |

### Components Modified

1. **index-items Lambda** (`packages/functions/index-items/cmd/main.go`)
   - [x] Build Bluge index instead of JSON
   - [x] Archive index directory as `global-index.tar.gz`
   - [x] On SHARED_LIBRARY INSERT/REMOVE, update `shared-libraries.json`
   - [x] Upload to S3
   - [x] Full resync via `yarn resync-index`

2. **Storage layer** (`packages/functions/api/repositories/s3/s3.go`)
   - [x] `GetBlugeIndex()` - download and extract index to /tmp
   - [x] `GetSharedLibraries()` - download and parse shared-libraries.json

3. **Search service** (`packages/functions/api/services/search.go`)
   - [x] Load pre-built index from S3
   - [x] Load shared libraries mapping
   - [x] Query with access filter (ownerId OR shared libraries)

### Benefits

| Aspect | Current (JSON rebuild) | Pre-built index |
|--------|------------------------|-----------------|
| Search latency | High (rebuild every time) | Low (load & query) |
| Book CRUD | Rebuild JSON | Rebuild index |
| Share/unshare | Rebuild JSON | Update mapping only |
| Memory usage | Spikes on rebuild | Steady (load only) |

### Future Optimizations

- **Lambda caching**: Keep index in memory between warm invocations
- **Incremental updates**: Bluge may support adding/removing docs without full rebuild
- **User sharding**: Partition index by user (faster search, more complex share/unshare)
