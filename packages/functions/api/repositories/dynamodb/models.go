package dynamodb

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

func serializeLek(input map[string]types.AttributeValue) (*string, error) {
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

func deserializeLek(input string) (map[string]types.AttributeValue, error) {
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
}

func makeLibraryPK(ownerId string) string {
	return fmt.Sprintf("owner#%s", ownerId)
}

func makeLibrarySK(libraryId string) string {
	return fmt.Sprintf("library#%s", libraryId)
}

func makeLibraryGSI1PK(ownerId string) string {
	return fmt.Sprintf("owner#%s", ownerId)
}

func makeLibraryGSI1SK(libraryName string) string {
	return fmt.Sprintf("library#%s", libraryName)
}

type LibraryItem struct {
	PK          string     `dynamodbav:"PK"`     // owner#<owner id>
	SK          string     `dynamodbav:"SK"`     // item#<item id>
	GSI1PK      string     `dynamodbav:"GSI1PK"` // owner#1234#library#<library id>
	GSI1SK      string     `dynamodbav:"GSI1SK"` // item#<item title>
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
}

func makeLibraryItemPK(ownerId string) string {
	return fmt.Sprintf("owner#%s", ownerId)
}

func makeLibraryItemSK(itemId string) string {
	return fmt.Sprintf("item#%s", itemId)
}

func makeLibraryItemGSI1PK(ownerId string, libraryId string) string {
	return fmt.Sprintf("owner#%s#library#%s", ownerId, libraryId)
}

func makeLibraryItemGSI1SK(itemTitle string) string {
	return fmt.Sprintf("item#%s", itemTitle)
}
