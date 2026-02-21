package domain

// IndexItem represents a matched item from Bluge search index
// Used to fetch full item details from DynamoDB after search
type IndexItem struct {
	PK         string   `json:"PK"`
	SK         string   `json:"SK"`
	Id         string   `json:"id"`
	Type       ItemType `json:"type"`
	OwnerId    string   `json:"ownerId"`
	LibraryId  string   `json:"libraryId"`
	Title      string   `json:"title"`
	Authors    []string `json:"authors,omitempty"`
	Collection *string  `json:"collection,omitempty"`
}
