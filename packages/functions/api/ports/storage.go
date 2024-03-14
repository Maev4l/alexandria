package ports

type Storage interface {
	PutPicture(ownerId string, libraryId string, itemId string, picture []byte) error
	GetPicture(ownerId string, libraryId string, itemId string) ([]byte, error)
	DeletePicture(ownerId string, libraryId string, itemId string) error
}
