package dynamodb

import (
	"fmt"
	"time"
)

type Library struct {
	PK          string     `dynamodbav:"PK"` // user#1234
	SK          string     `dynamodbav:"SK"` // library#1234
	Id          string     `dynamodbav:"Id"`
	Name        string     `dynamodbav:"Name"`
	Description string     `dynamodbav:"Description"`
	OwnerName   string     `dynamodbav:"OwnerName"`
	TotalItems  int        `dynamodbav:"TotalItems"`
	UpdatedAt   *time.Time `dynamodbav:"UpdatedAt"`
}

func createLibraryPK(ownerId string) string {
	return fmt.Sprintf("owner#%s", ownerId)
}

func createLibrarySK(libraryId string) string {
	return fmt.Sprintf("library#%s", libraryId)
}
