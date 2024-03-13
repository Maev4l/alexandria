package ports

type Storage interface {
	PutPicture(ownerId string, libraryId string, itemId string, picture []byte) error
}
