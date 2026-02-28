# Data storage

The data are stored in a DynamoDB table, with a single table design with 2 Global Secondary Indexes (GSI1, GSI2).

### Entity Types

| Entity | EntityType | Description |
|--------|------------|-------------|
| LIBRARY | `LIBRARY` | User's media collection |
| COLLECTION | `COLLECTION` | Named group of items within a library |
| BOOK | `BOOK` | Book item within a library |
| VIDEO | `VIDEO` | Video item (DVD/Bluray) within a library |
| EVENT | `EVENT` | Lending/return history entry |
| SHARED_LIBRARY | `SHARED_LIBRARY` | Pointer to a library shared with another user |

### Key Patterns

#### Main Table (PK + SK)

| Entity | PK | SK |
|--------|-----|-----|
| LIBRARY | `owner#<OwnerId>` | `library#<LibraryId>` |
| COLLECTION | `owner#<OwnerId>` | `library#<LibraryId>#collection#<CollectionId>` |
| BOOK | `owner#<OwnerId>` | `library#<LibraryId>#item#<ItemId>` |
| VIDEO | `owner#<OwnerId>` | `library#<LibraryId>#item#<ItemId>` |
| EVENT | `owner#<OwnerId>` | `library#<LibraryId>#item#<ItemId>#event#<timestamp>` |
| SHARED_LIBRARY | `owner#<SharedToId>` | `shared-library#<LibraryId>` |

**Access patterns:**
- Get all libraries for user: `PK = owner#<userId>` + `SK begins_with library#`
- Get all collections in library: `PK = owner#<userId>` + `SK begins_with library#<libId>#collection#`
- Get all items in library: `PK = owner#<userId>` + `SK begins_with library#<libId>#item#` (returns both BOOKs and VIDEOs)
- Get all events for item: `PK = owner#<userId>` + `SK begins_with library#<libId>#item#<itemId>#event#`
- Get shared libraries: `PK = owner#<userId>` + `SK begins_with shared-library#`

### GSI1: Library-Scoped Sorting

**Purpose**: List items/collections within a library sorted alphabetically; collections appear alongside their items

| Entity | GSI1PK | GSI1SK |
|--------|--------|--------|
| LIBRARY | `owner#<OwnerId>` | `library#<LibraryName>` |
| COLLECTION | `owner#<OwnerId>#library#<LibraryId>` | `item#<CollectionName>` |
| BOOK (in collection) | `owner#<OwnerId>#library#<LibraryId>` | `item#<CollectionName>#<Order 5-digits>#<Title>` |
| BOOK (standalone) | `owner#<OwnerId>#library#<LibraryId>` | `item#<Title>` |
| VIDEO (in collection) | `owner#<OwnerId>#library#<LibraryId>` | `item#<CollectionName>#<Order 5-digits>#<Title>` |
| VIDEO (standalone) | `owner#<OwnerId>#library#<LibraryId>` | `item#<Title>` |
| EVENT | `owner#<OwnerId>#library#<LibraryId>#item#<ItemId>` | `event#<timestamp>` |

**GSI1SK Examples:**
```
item#Angelo                                      ← standalone item
item#Chroniques de Dragonlance                   ← collection entity
item#Chroniques de Dragonlance#00001#Dragons d'un crépuscule d'automne
item#Chroniques de Dragonlance#00002#Dragons d'une nuit d'hiver
item#Cycle des princes d'Ambre                   ← collection entity
item#Cycle des princes d'Ambre#00001#Les 9 princes d'ambre
item#Cycle des princes d'Ambre#00010#Prince du Chaos
item#Effondrement                                ← standalone item
```

**Note**: Collection entities use `item#<name>` prefix so they sort with items:
- Collections sort BEFORE their items: `item#Foo` < `item#Foo#00001#Title`
- EntityType attribute (`COLLECTION` vs `BOOK`/`VIDEO`) distinguishes record types
- CollectionId attribute determines if an item belongs to a collection

**Access patterns:**
- `GSI1PK = owner#X` → all libraries sorted by name
- `GSI1PK = owner#X#library#Y` → all items + collections in library, sorted alphabetically
- `GSI1PK = owner#X#library#Y` + `SK begins_with collection#` → all collections in library
- `GSI1PK = owner#X#library#Y#item#Z` → all history events chronologically

### GSI2: Cross-Library Title Search

**Purpose**: Search/sort all items across ALL user's libraries by title

| Entity | GSI2PK | GSI2SK |
|--------|--------|--------|
| BOOK | `owner#<OwnerId>` | `item#<Title>` |
| VIDEO | `owner#<OwnerId>` | `item#<Title>` |

**Access patterns:**
- `GSI2PK = owner#X` → all items (books + videos) across all libraries, sorted by title
- Used by fuzzy search feature

### Entity Attributes

#### LIBRARY
| Attribute | Description |
|-----------|-------------|
| OwnerId | User ID (Cognito sub, no dashes, uppercase) |
| LibraryId | UUID |
| LibraryName | Display name (max 20 chars) |
| Description | Optional description (max 100 chars) |
| TotalItems | Item count (denormalized) |
| SharedTo | Array of emails this library is shared with |
| UpdatedAt | ISO timestamp |

#### COLLECTION
| Attribute | Description |
|-----------|-------------|
| OwnerId | User ID |
| LibraryId | Parent library UUID |
| CollectionId | UUID |
| Name | Collection name (unique within library, max 100 chars) |
| Description | Optional description (max 500 chars) |
| ItemCount | Number of items in collection (denormalized) |

#### BOOK
| Attribute | Description |
|-----------|-------------|
| OwnerId | User ID |
| LibraryId | Parent library UUID |
| ItemId | UUID |
| Title | Book title |
| Authors | Array of author names |
| Summary | Book description |
| Isbn | ISBN code |
| PictureUrl | Cover image URL |
| CollectionId | Optional collection UUID (null if standalone) |
| CollectionName | Denormalized collection name (updated by consistency-manager) |
| Order | Position in collection (1-1000, stored as 5-digit padded in GSI1SK) |
| Type | Item type (0 = Book) |
| LentTo | Name of borrower (null if not lent) |
| LibraryName | Denormalized for display |
| OwnerName | Denormalized for display |

#### VIDEO
| Attribute | Description |
|-----------|-------------|
| OwnerId | User ID |
| LibraryId | Parent library UUID |
| ItemId | UUID |
| Title | Video title |
| Summary | Video plot/description |
| Directors | Array of director names |
| Cast | Array of actor names (top 5) |
| ReleaseYear | Year of release |
| Duration | Runtime in minutes |
| TmdbId | TMDB movie ID (for future lookups) |
| PictureUrl | Poster image URL |
| CollectionId | Optional collection UUID (null if standalone) |
| CollectionName | Denormalized collection name (updated by consistency-manager) |
| Order | Position in collection (1-1000, stored as 5-digit padded in GSI1SK) |
| Type | Item type (1 = Video) |
| LentTo | Name of borrower (null if not lent) |
| LibraryName | Denormalized for display |
| OwnerName | Denormalized for display |

#### EVENT
| Attribute | Description |
|-----------|-------------|
| Type | `LENT` or `RETURNED` |
| Event | Borrower name |
| UpdatedAt | ISO timestamp |

#### SHARED_LIBRARY
| Attribute | Description |
|-----------|-------------|
| SharedToId | Recipient user ID |
| SharedFromId | Owner user ID |
| SharedFromName | Owner display name |
| LibraryId | Shared library UUID |

### Design Notes

1. **Order Padding**: `Order` is zero-padded to 5 digits (`00001`) for proper string sorting
2. **Collection Grouping**: `CollectionName#Order#Title` in GSI1SK clusters items by collection
3. **Standalone Items**: Items without collection have GSI1SK = `item#<Title>` (sorts after collections alphabetically)
4. **Hierarchical GSI1PK**: Grows with hierarchy depth (owner → library → item)
5. **Denormalization**: `LibraryName`, `OwnerName`, `CollectionName` stored on items to avoid joins
6. **Collection as First-Class Entity**: Collections have their own records with `CollectionId`; items reference via `CollectionId` + denormalized `CollectionName`
7. **Consistency Manager**: DynamoDB stream triggers propagate COLLECTION name changes to all items in that collection; COLLECTION deletes orphan items (set `CollectionId`/`CollectionName`/`Order` to null)




