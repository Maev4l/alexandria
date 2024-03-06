package dynamodb

import (
	"context"
	"errors"
	"time"

	"alexandria.isnan.eu/functions/api/domain"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/rs/zerolog/log"
)

func (d *dynamo) DeleteLibrary(l *domain.Library) error {
	result, err := d.client.DeleteItem(context.TODO(), &dynamodb.DeleteItemInput{
		TableName: aws.String(tableName),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: createLibraryPK(l.OwnerId)},
			"SK": &types.AttributeValueMemberS{Value: createLibrarySK(l.Id)},
		},
		ReturnValues: types.ReturnValueAllOld,
	})

	if err != nil {
		log.Error().Str("id", l.Id).Msgf("Failed to update library: %s", err.Error())
		return err
	}

	// Item does not exist
	if len(result.Attributes) == 0 {
		log.Error().Str("id", l.Id).Msg("Library does not exists")
		return errors.New("Library does not exists")
	}

	// TODO:
	// Remove all books belonging to this library

	return nil
}

func (d *dynamo) UpdateLibrary(l *domain.Library) error {

	_, err := d.client.UpdateItem(context.TODO(),
		&dynamodb.UpdateItemInput{
			TableName: aws.String(tableName),
			Key: map[string]types.AttributeValue{
				"PK": &types.AttributeValueMemberS{Value: createLibraryPK(l.OwnerId)},
				"SK": &types.AttributeValueMemberS{Value: createLibrarySK(l.Id)},
			},
			UpdateExpression:    aws.String("set LibraryName = :name, Description = :description, UpdatedAt = :updatedAt"),
			ConditionExpression: aws.String("attribute_exists(PK)"),
			ExpressionAttributeValues: map[string]types.AttributeValue{
				":name":        &types.AttributeValueMemberS{Value: l.Name},
				":description": &types.AttributeValueMemberS{Value: l.Description},
				":updatedAt":   &types.AttributeValueMemberS{Value: l.UpdatedAt.Format(time.RFC3339Nano)},
			},
		})

	if err != nil {
		log.Error().Str("id", l.Id).Msgf("Failed to update library: %s", err.Error())
		return err
	}

	return nil
}

func (d *dynamo) QueryLibraries(ownerId string) ([]domain.Library, error) {
	query := dynamodb.QueryInput{
		TableName:              aws.String(tableName),
		KeyConditionExpression: aws.String("#pk = :ownerId and begins_with(#sk,:library_prefix)"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":ownerId": &types.AttributeValueMemberS{
				Value: createLibraryPK(ownerId),
			},
			":library_prefix": &types.AttributeValueMemberS{
				Value: "library#",
			},
		},
		ExpressionAttributeNames: map[string]string{
			"#pk": "PK",
			"#sk": "SK",
		},
	}

	queryPaginator := dynamodb.NewQueryPaginator(d.client, &query)

	ctx := context.TODO()

	records := []domain.Library{}
	for i := 0; queryPaginator.HasMorePages(); i++ {
		result, err := queryPaginator.NextPage(ctx)
		if err != nil {
			log.Error().Msgf("Failed to query libraries: %s", err.Error())
			return nil, err
		}

		if result.Count > 0 {
			for _, item := range result.Items {

				record := Library{}
				if err := attributevalue.UnmarshalMap(item, &record); err != nil {
					log.Warn().Msgf("Failed to unmarshal library: %s", err.Error())
				}

				records = append(records, domain.Library{
					Id:          record.Id,
					Name:        record.Name,
					Description: record.Description,
					TotalItems:  record.TotalItems,
					UpdatedAt:   record.UpdatedAt,
					OwnerName:   record.OwnerName,
				})
			}
		}
	}

	return records, nil
}

func (d *dynamo) PutLibrary(l *domain.Library) error {

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
		log.Error().Str("name", l.Name).Msgf("Failed to marshal library: %s", err.Error())
		return err
	}

	_, err = d.client.PutItem(context.TODO(), &dynamodb.PutItemInput{
		TableName: aws.String(tableName),
		Item:      item,
	})

	if err != nil {
		log.Error().Str("name", l.Name).Msgf("Failed to put library: %s", err.Error())
		return err
	}

	return nil
}
