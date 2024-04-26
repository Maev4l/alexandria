package persistence

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

func SerializeLek(input map[string]types.AttributeValue) (*string, error) {
	var inputMap map[string]interface{}
	err := attributevalue.UnmarshalMap(input, &inputMap)
	if err != nil {
		return nil, err
	}
	bytesJSON, err := json.Marshal(inputMap)
	if err != nil {
		return nil, err
	}
	output := base64.StdEncoding.EncodeToString(bytesJSON)
	return &output, nil
}

func DeserializeLek(input string) (map[string]types.AttributeValue, error) {
	bytesJSON, err := base64.StdEncoding.DecodeString(input)
	if err != nil {
		return nil, err
	}
	outputJSON := map[string]interface{}{}
	err = json.Unmarshal(bytesJSON, &outputJSON)
	if err != nil {
		return nil, err
	}

	return attributevalue.MarshalMap(outputJSON)
}

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
	return fmt.Sprintf("library#%s", libraryName)
}

type LibraryItem struct {
	PK          string     `dynamodbav:"PK"`     // owner#<owner id>
	SK          string     `dynamodbav:"SK"`     // library#<library id>#item#<item id>
	GSI1PK      string     `dynamodbav:"GSI1PK"` // owner#<owner id>#library#<library id>
	GSI1SK      string     `dynamodbav:"GSI1SK"` // item#<item title>
	GSI2PK      string     `dynamodbav:"GSI2PK"` // owner#<owner id>
	GSI2SK      string     `dynamodbav:"GSI2SK"` // item#<item title>
	Id          string     `dynamodbav:"ItemId"`
	Title       string     `dynamodbav:"Title"`
	OwnerName   string     `dynamodbav:"OwnerName"`
	OwnerId     string     `dynamodbav:"OwnerId"`
	LibraryId   string     `dynamodbav:"LibraryId"`
	LibraryName string     `dynamodbav:"LibraryName"`
	UpdatedAt   *time.Time `dynamodbav:"UpdatedAt"`
	Summary     string     `dynamodbav:"Summary"`
	Authors     []string   `dynamodbav:"Authors"`
	Isbn        string     `dynamodbav:"Isbn"`
	Type        int        `dynamodbav:"Type"`
	PictureUrl  *string    `dynamodbav:"PictureUrl,omitempty"`
	LentTo      *string    `dynamodbav:"LentTo,omitempty"`
}

func MakeLibraryItemPK(ownerId string) string {
	return fmt.Sprintf("owner#%s", ownerId)
}

func MakeLibraryItemSK(libraryid string, itemId string) string {
	return fmt.Sprintf("library#%s#item#%s", libraryid, itemId)
}

func MakeLibraryItemGSI1PK(ownerId string, libraryId string) string {
	return fmt.Sprintf("owner#%s#library#%s", ownerId, libraryId)
}

func MakeLibraryItemGSI1SK(itemTitle string) string {
	return fmt.Sprintf("item#%s", itemTitle)
}

func MakeLibraryItemGSI2PK(ownerId string) string {
	return fmt.Sprintf("owner#%s", ownerId)
}

func MakeLibraryItemGSI2SK(itemTitle string) string {
	return fmt.Sprintf("item#%s", itemTitle)
}

type SharedLibrary struct {
	PK             string     `dynamodbav:"PK"` // owner#<owner id>
	SK             string     `dynamodbav:"SK"` // shared-library#<library id>
	LibraryId      string     `dynamodbav:"LibraryId"`
	SharedToId     string     `dynamodbav:"SharedToId"`     // user the library is shared to
	SharedFromId   string     `dynamodbav:"SharedFromId"`   // original owner of the library
	SharedFromName string     `dynamodbav:"SharedFromName"` // original library owner
	UpdatedAt      *time.Time `dynamodbav:"UpdatedAt"`
}

func MakeSharedLibraryPK(ownerId string) string {
	return fmt.Sprintf("owner#%s", ownerId)
}

func MakeSharedLibrarySK(libraryId string) string {
	return fmt.Sprintf("shared-library#%s", libraryId)
}

type ItemEvent struct {
	PK        string     `dynamodbav:"PK"`     // owner#<owner id>
	SK        string     `dynamodbav:"SK"`     // library#<library id>#item#<item id>#event#<event date>
	GSI1PK    string     `dynamodbav:"GSI1PK"` // owner#<owner id>#library#<library id>#item#<item id>
	GSI1SK    string     `dynamodbav:"GSI1SK"` // event#<event date>
	Type      string     `dynamodbav:"Type"`
	Event     string     `dynamodbav:"Event"`
	UpdatedAt *time.Time `dynamodbav:"UpdatedAt"`
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
