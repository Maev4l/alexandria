# Alexandria Search Architecture

## Implementation Status: DONE

## Solution: Pre-built Global Index with Access Filtering

Build a single global Bluge index containing **all items** with ownership metadata. Store it in S3. At search time, load the pre-built index and filter by access rights.

### Document Structure

The document layout and the query that reads it both live in
`packages/functions/internal/searchindex`, deliberately in one package. They have to agree on
two things and previously did not — the set of searchable fields, and the fold applied to the
text in them — so keeping them apart made divergence a runtime surprise instead of a
compile-time concern. The indexer and the search service both call it; neither builds a
document or a query of its own.

Each indexed document includes:
- **Text fields** (folded, fuzzy searchable): `title`, `authors`, `directors`, `cast`,
  `collection`
- **Keyword fields** (exact match for access filtering, never folded): `ownerId`, `libraryId`

`summary` and `isbn` are deliberately absent. `ui-v3.md` prints the searched-field list to the
reader at the zero-result state and names those two as the fields that were not searched, so
adding either changes what the app promises.

### Accent folding

Indexed text and query terms both pass through `persistence.NormalizeForMatching`
(NFD → strip combining marks → NFC → lowercase) — the same fold that builds DynamoDB sort keys,
called from one place by all three consumers.

Wildcard and fuzzy queries are term-level and bypass Bluge's analyzer, so the fold has to be
applied explicitly on both sides. Applying it on only one silently stops matching.

Before this, terms were merely lowercased and relied on `NewFuzzyQuery`'s default fuzziness of 1
to bridge accents: `etranger` reached `étranger` at one edit, but `elephants` never reached
`éléphants` at two. On a catalogue that is deliberately half French that was a routine miss.
Fuzziness now covers typos only, which is what it is for.

**A change to the fold, the field list, or the document id requires `make resync-index`** —
documents already in the index carry the old shape and no amount of waiting rewrites them.

### Result ordering

Bluge scores every match. The service sorts on that score, most relevant first, and the
repository re-applies that order after fetching from DynamoDB, since `BatchGetItem` answers in
no order of its own. The score itself is never returned to the client.

Previously only the document id was kept, so the ranking was discarded and results reached the
reader in effectively arbitrary order.

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
   - [x] Full resync via `make resync-index`

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
