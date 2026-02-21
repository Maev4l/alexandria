# Data storage

The data are stored in a DynamoDB table, with a single table design with 2 Global Secondary Indexes (GSI1, GSI2).

### Entity Types

| Entity | EntityType | Description |
|--------|------------|-------------|
| LIBRARY | `LIBRARY` | User's media collection |
| BOOK | `BOOK` | Book item within a library |
| VIDEO | `VIDEO` | Video item (DVD/Bluray) within a library |
| EVENT | `EVENT` | Lending/return history entry |
| SHARED_LIBRARY | `SHARED_LIBRARY` | Pointer to a library shared with another user |

### Key Patterns

#### Main Table (PK + SK)

| Entity | PK | SK |
|--------|-----|-----|
| LIBRARY | `owner#<OwnerId>` | `library#<LibraryId>` |
| BOOK | `owner#<OwnerId>` | `library#<LibraryId>#item#<ItemId>` |
| VIDEO | `owner#<OwnerId>` | `library#<LibraryId>#item#<ItemId>` |
| EVENT | `owner#<OwnerId>` | `library#<LibraryId>#item#<ItemId>#event#<timestamp>` |
| SHARED_LIBRARY | `owner#<SharedToId>` | `shared-library#<LibraryId>` |

**Access patterns:**
- Get all libraries for user: `PK = owner#<userId>` + `SK begins_with library#`
- Get all items in library: `PK = owner#<userId>` + `SK begins_with library#<libId>#item#` (returns both BOOKs and VIDEOs)
- Get all events for item: `PK = owner#<userId>` + `SK begins_with library#<libId>#item#<itemId>#event#`
- Get shared libraries: `PK = owner#<userId>` + `SK begins_with shared-library#`

### GSI1: Library-Scoped Sorting

**Purpose**: List items within a library sorted by collection → order → title

| Entity | GSI1PK | GSI1SK |
|--------|--------|--------|
| LIBRARY | `owner#<OwnerId>` | `library#<LibraryName>` |
| BOOK (in collection) | `owner#<OwnerId>#library#<LibraryId>` | `item#<Collection>#<Order 5-digits>#<Title>` |
| BOOK (standalone) | `owner#<OwnerId>#library#<LibraryId>` | `item#<Title>` |
| VIDEO (in collection) | `owner#<OwnerId>#library#<LibraryId>` | `item#<Collection>#<Order 5-digits>#<Title>` |
| VIDEO (standalone) | `owner#<OwnerId>#library#<LibraryId>` | `item#<Title>` |
| EVENT | `owner#<OwnerId>#library#<LibraryId>#item#<ItemId>` | `event#<timestamp>` |

**GSI1SK Examples:**
```
item#Angelo                                      ← standalone
item#Chroniques de Dragonlance#00001#Dragons d'un crépuscule d'automne
item#Chroniques de Dragonlance#00002#Dragons d'une nuit d'hiver
item#Cycle des princes d'Ambre#00001#Les 9 princes d'ambre
item#Cycle des princes d'Ambre#00010#Prince du Chaos
item#Effondrement                                ← standalone
```

**Access patterns:**
- `GSI1PK = owner#X` → all libraries sorted by name
- `GSI1PK = owner#X#library#Y` → all items in library, collections grouped + sorted
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
| Collection | Optional collection name |
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
| Collection | Optional collection name |
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
2. **Collection Grouping**: `Collection#Order#Title` in GSI1SK clusters books by collection
3. **Standalone Books**: Books without collection have GSI1SK = `item#<Title>` (sorts after collections alphabetically)
4. **Hierarchical GSI1PK**: Grows with hierarchy depth (owner → library → item)
5. **Denormalization**: `LibraryName`, `OwnerName` stored on BOOKs to avoid joins




