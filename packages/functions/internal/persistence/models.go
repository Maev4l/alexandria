package persistence

import (
	"fmt"
	"time"
)

type EntityType string

const (
	TypeLibrary       EntityType = "LIBRARY"
	TypeSharedLibrary EntityType = "SHARED_LIBRARY"
	TypeBook          EntityType = "BOOK"
	TypeVideo         EntityType = "VIDEO"
	TypeEvent         EntityType = "EVENT"
	TypeCollection    EntityType = "COLLECTION"
)

type Library struct {
	PK          string     `dynamodbav:"PK"`     // owner#<owner id>
	SK          string     `dynamodbav:"SK"`     // library#<library id>
	GSI1PK      string     `dynamodbav:"GSI1PK"` // owner#<owner id>
	GSI1SK      string     `dynamodbav:"GSI1SK"` // library#<library name>
	Id          string     `dynamodbav:"LibraryId"`
	Name        string     `dynamodbav:"LibraryName"`
	Description string     `dynamodbav:"Description"`
	OwnerName   string     `dynamodbav:"OwnerName"`
	OwnerId     string     `dynamodbav:"OwnerId"`
	TotalItems  int        `dynamodbav:"TotalItems"`
	UpdatedAt   *time.Time `dynamodbav:"UpdatedAt"`
	SharedTo    []string   `dynamodbav:"SharedTo"`
	EntityType  EntityType `dynamodbav:"EntityType"`
}

func MakeLibraryPK(ownerId string) string {
	return fmt.Sprintf("owner#%s", ownerId)
}

func MakeLibrarySK(libraryId string) string {
	return fmt.Sprintf("library#%s", libraryId)
}

func MakeLibraryGSI1PK(ownerId string) string {
	return fmt.Sprintf("owner#%s", ownerId)
}

func MakeLibraryGSI1SK(libraryName string) string {
	// Normalize for consistent alphabetical sorting regardless of accents
	return fmt.Sprintf("library#%s", NormalizeForSort(libraryName))
}

type LibraryItem struct {
	PK             string     `dynamodbav:"PK"`     // owner#<owner id>
	SK             string     `dynamodbav:"SK"`     // library#<library id>#item#<item id>
	GSI1PK         string     `dynamodbav:"GSI1PK"` // owner#<owner id>#library#<library id>
	GSI1SK         string     `dynamodbav:"GSI1SK"` // item#<collection name>#<order>#<item title> or item#<item title>
	GSI2PK         string     `dynamodbav:"GSI2PK"` // owner#<owner id>
	GSI2SK         string     `dynamodbav:"GSI2SK"` // item#<item title>
	Id             string     `dynamodbav:"ItemId"`
	Title          string     `dynamodbav:"Title"`
	OwnerName      string     `dynamodbav:"OwnerName"`
	OwnerId        string     `dynamodbav:"OwnerId"`
	LibraryId      string     `dynamodbav:"LibraryId"`
	LibraryName    string     `dynamodbav:"LibraryName"`
	UpdatedAt      *time.Time `dynamodbav:"UpdatedAt"`
	Summary        string     `dynamodbav:"Summary"`
	Authors        []string   `dynamodbav:"Authors"`
	Isbn           string     `dynamodbav:"Isbn"`
	Type           int        `dynamodbav:"Type"`
	PictureUrl     *string    `dynamodbav:"PictureUrl,omitempty"`
	LentTo         *string    `dynamodbav:"LentTo,omitempty"`
	EntityType     EntityType `dynamodbav:"EntityType"`
	CollectionId   *string    `dynamodbav:"CollectionId,omitempty"`   // FK to Collection entity
	CollectionName *string    `dynamodbav:"CollectionName,omitempty"` // Denormalized for GSI1SK sorting
	Order          *int       `dynamodbav:"Order,omitempty"`
	// Video-specific fields
	Directors   []string `dynamodbav:"Directors,omitempty"`
	Cast        []string `dynamodbav:"Cast,omitempty"`
	ReleaseYear *int     `dynamodbav:"ReleaseYear,omitempty"`
	Duration    *int     `dynamodbav:"Duration,omitempty"`
	TmdbId      *string  `dynamodbav:"TmdbId,omitempty"`
}

func MakeLibraryItemPK(ownerId string) string {
	return fmt.Sprintf("owner#%s", ownerId)
}

func MakeLibraryItemSK(libraryId string, itemId string) string {
	return fmt.Sprintf("library#%s#item#%s", libraryId, itemId)
}

func MakeLibraryItemGSI1PK(ownerId string, libraryId string) string {
	return fmt.Sprintf("owner#%s#library#%s", ownerId, libraryId)
}

func MakeLibraryItemGSI1SK(itemTitle string, collectionName *string, order *int) string {
	// Normalize for consistent alphabetical sorting regardless of accents
	normalizedTitle := NormalizeForSort(itemTitle)

	// Both collectionName AND order are required for grouped sorting
	// If either is missing/invalid, use simple title-only format
	if collectionName == nil || len(*collectionName) == 0 || order == nil || *order < 1 {
		return fmt.Sprintf("item#%s", normalizedTitle)
	}

	// Order padded to 5 digits for correct lexicographic sorting (00001-01000)
	orderStr := fmt.Sprintf("%05d", *order)
	normalizedCollection := NormalizeForSort(*collectionName)
	return fmt.Sprintf("item#%s#%s#%s", normalizedCollection, orderStr, normalizedTitle)
}

func MakeLibraryItemGSI2PK(ownerId string) string {
	return fmt.Sprintf("owner#%s", ownerId)
}

func MakeLibraryItemGSI2SK(itemTitle string) string {
	// Normalize for consistent alphabetical sorting regardless of accents
	return fmt.Sprintf("item#%s", NormalizeForSort(itemTitle))
}

// Collection represents a grouping of items within a library
type Collection struct {
	PK          string     `dynamodbav:"PK"`     // owner#<owner id>
	SK          string     `dynamodbav:"SK"`     // library#<library id>#collection#<collection id>
	GSI1PK      string     `dynamodbav:"GSI1PK"` // owner#<owner id>#library#<library id>
	GSI1SK      string     `dynamodbav:"GSI1SK"` // collection#<collection name>
	Id          string     `dynamodbav:"CollectionId"`
	Name        string     `dynamodbav:"CollectionName"`
	Description string     `dynamodbav:"Description"`
	ItemCount   int        `dynamodbav:"ItemCount"`
	OwnerId     string     `dynamodbav:"OwnerId"`
	LibraryId   string     `dynamodbav:"LibraryId"`
	CreatedAt   *time.Time `dynamodbav:"CreatedAt"`
	UpdatedAt   *time.Time `dynamodbav:"UpdatedAt"`
	EntityType  EntityType `dynamodbav:"EntityType"`
}

func MakeCollectionPK(ownerId string) string {
	return fmt.Sprintf("owner#%s", ownerId)
}

func MakeCollectionSK(libraryId string, collectionId string) string {
	return fmt.Sprintf("library#%s#collection#%s", libraryId, collectionId)
}

func MakeCollectionGSI1PK(ownerId string, libraryId string) string {
	return fmt.Sprintf("owner#%s#library#%s", ownerId, libraryId)
}

// MakeCollectionGSI1SK returns GSI1SK for a collection.
// Uses "item#<name>" prefix so collections sort alphabetically with items.
// Collections sort BEFORE their items: "item#Foo" < "item#Foo#00001#Title"
// EntityType attribute distinguishes COLLECTION from BOOK/VIDEO.
func MakeCollectionGSI1SK(collectionName string) string {
	// Normalize for consistent alphabetical sorting regardless of accents
	return fmt.Sprintf("item#%s", NormalizeForSort(collectionName))
}

type SharedLibrary struct {
	PK             string     `dynamodbav:"PK"` // owner#<owner id>
	SK             string     `dynamodbav:"SK"` // shared-library#<library id>
	LibraryId      string     `dynamodbav:"LibraryId"`
	SharedToId     string     `dynamodbav:"SharedToId"`     // user the library is shared to
	SharedFromId   string     `dynamodbav:"SharedFromId"`   // original owner of the library
	SharedFromName string     `dynamodbav:"SharedFromName"` // original library owner
	UpdatedAt      *time.Time `dynamodbav:"UpdatedAt"`
	EntityType     EntityType `dynamodbav:"EntityType"`
}

func MakeSharedLibraryPK(ownerId string) string {
	return fmt.Sprintf("owner#%s", ownerId)
}

func MakeSharedLibrarySK(libraryId string) string {
	return fmt.Sprintf("shared-library#%s", libraryId)
}

type ItemEvent struct {
	PK         string     `dynamodbav:"PK"`     // owner#<owner id>
	SK         string     `dynamodbav:"SK"`     // library#<library id>#item#<item id>#event#<event date>
	GSI1PK     string     `dynamodbav:"GSI1PK"` // owner#<owner id>#library#<library id>#item#<item id>
	GSI1SK     string     `dynamodbav:"GSI1SK"` // event#<event date>
	Type       string     `dynamodbav:"Type"`
	Event      string     `dynamodbav:"Event"`
	UpdatedAt  *time.Time `dynamodbav:"UpdatedAt"`
	EntityType EntityType `dynamodbav:"EntityType"`
}

func MakeItemEventPK(ownerId string) string {
	return fmt.Sprintf("owner#%s", ownerId)
}

func MakeItemEventSK(libraryId string, itemId string, date time.Time) string {
	return fmt.Sprintf("library#%s#item#%s#event#%s", libraryId, itemId, date.Format("2006/01/02.15:04:05"))
}

func MakeItemEventGSI1PK(ownerId string, libraryId string, itemId string) string {
	return fmt.Sprintf("owner#%s#library#%s#item#%s", ownerId, libraryId, itemId)
}
func MakeItemEventGSI1SK(date time.Time) string {
	return fmt.Sprintf("event#%s", date.Format("2006/01/02.15:04:05"))
}
