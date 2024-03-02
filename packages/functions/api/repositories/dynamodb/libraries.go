package dynamodb

import (
	"context"

	"alexandria.isnan.eu/functions/api/domain"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/rs/zerolog/log"
)

func (d *dynamo) SaveLibrary(l *domain.Library) error {

	record := Library{
		PK:          createLibraryPK(l.OwnerId),
		SK:          createLibrarySK(l.Id),
		Id:          l.Id,
		OwnerName:   l.OwnerName,
		Name:        l.Name,
		Description: l.Description,
		TotalItems:  0,
		UpdatedAt:   l.UpdatedAt,
	}

	item, err := attributevalue.MarshalMap(record)
	if err != nil {
		log.Error().Msgf("Failed to marshal library '%s': %s", l.Name, err.Error())
		return err
	}

	_, err = d.client.PutItem(context.TODO(), &dynamodb.PutItemInput{
		TableName: aws.String(tableName),
		Item:      item,
	})

	if err != nil {
		log.Error().Msgf("Failed to put library '%s': %s", l.Name, err.Error())
		return err
	}

	return nil
}
