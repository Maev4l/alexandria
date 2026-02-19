package ports

// SharedLibraryEntry represents a shared library for access filtering
type SharedLibraryEntry struct {
	OwnerId   string `json:"ownerId"`
	LibraryId string `json:"libraryId"`
}

type Storage interface {
	PutPicture(ownerId string, libraryId string, itemId string, picture []byte) error
	GetPicture(ownerId string, libraryId string, itemId string) ([]byte, error)
	DeletePicture(ownerId string, libraryId string, itemId string) error
	DeletePictures(ownerId string, libraryId string) error
	// GetBlugeIndex downloads and extracts the Bluge index, returns path to index directory
	GetBlugeIndex() (string, func(), error)
	// GetSharedLibraries returns the shared libraries map (sharedToId -> []SharedLibraryEntry)
	GetSharedLibraries() (map[string][]SharedLibraryEntry, error)
}
