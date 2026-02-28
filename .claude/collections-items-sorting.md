# Collection Grouping & Pagination

## Overview

The `ListLibraryItems` API returns items with server-side grouping. Collections (type=2) contain nested `items` arrays. This enables the UI to display collections as expandable cards with their items inside.

## GSI1SK Sorting

Collections and items share the same GSI1 with prefix `item#`:

| Entity | GSI1SK Format | Example |
|--------|---------------|---------|
| Collection "Foo" | `item#<name>` | `item#Foo` |
| Standalone item | `item#<title>` | `item#Bar` |
| Item in collection | `item#<collectionName>#<order_5digits>#<title>` | `item#Foo#00001#MyBook` |

Sort order: `item#Foo` < `item#Foo#00001#MyBook` (collection header before its items).

## Edge Case: Same Name

When a standalone item has the same title as a collection, they have identical GSI1SK. DynamoDB sorts by SK: collection SK (`#collection#`) < item SK (`#item#`), so collection comes first.

DynamoDB returns the collection first (by SK), so the grouping logic correctly places the collection before the standalone item with the same name.

## Backend State Machine

Location: `api/repositories/dynamodb/items.go` → `QueryLibraryContentGrouped()`

```
for each record:
  if EntityType == COLLECTION:
    - flush currentCollection to items[]
    - start new currentCollection (with ItemCount from DynamoDB)
  else (BOOK/VIDEO):
    if item.CollectionId == currentCollection.Id:
      - add to currentCollection.Items
    else if item.CollectionId != "" (different collection):
      - flush currentCollection, add item standalone
    else (standalone, no collectionId):
      - flush currentCollection first (preserves sort order)
      - add item standalone
```

## Pagination State

When page ends mid-collection, context is saved for next page:

```go
type CollectionContext struct {
    Id          string
    Name        string
    Description string
    ItemCount   int  // denormalized from DynamoDB
}
```

- Page N: includes `currentCollection` in output AND saves context
- Page N+1: restores collection with `Partial: true`, merges additional items

## ItemCount Denormalization

Collections store `ItemCount` (updated via `IncrementCollectionItemCount`). This allows:
- UI shows correct count before all items load
- Skeleton placeholders for pending items: `itemCount - items.length`
- Empty state only when `itemCount === 0`

## Frontend Merge

Location: `web-client-v2/src/state/LibrariesContext.jsx` → `mergeItems()`

Searches for matching collection by ID (not just last item) to handle interleaved standalone items:

```js
if (item.type === COLLECTION && item.partial) {
  const idx = result.findIndex(r => r.type === COLLECTION && r.id === item.id);
  if (idx >= 0) { /* merge items */ }
}
```

## Key Files

- `api/repositories/dynamodb/items.go` - `QueryLibraryContentGrouped()`
- `api/handlers/items.go` - `ListLibraryItems()`
- `internal/persistence/models.go` - GSI1SK builders
- `web-client-v2/src/state/LibrariesContext.jsx` - `mergeItems()`
- `web-client-v2/src/components/CollectionCard.jsx` - skeleton display
