package domain

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

type IndexLibrary struct {
	Id    string                `json:"id"`
	Items map[string]*IndexItem `json:"items"`
}

type IndexSharedLibrary struct {
	OwnerId   string `json:"ownerId"`
	LibraryId string `json:"libraryId"`
}

/*
	{
		libraries: {
			<user id>: {
				<library id>: {
					id: <library id>,
					items: {
						<item id>: {
							id: <item id>,
							....
						}
					}
				}
			}
		}
	}
*/
type IndexDatabase struct {
	Libraries              map[string]map[string]*IndexLibrary      `json:"libraries"`
	UsersToSharedLibraries map[string]map[string]IndexSharedLibrary `json:"usersToSharedLibraries"` // map (user id -> map (library id) -> library original owner)
}
