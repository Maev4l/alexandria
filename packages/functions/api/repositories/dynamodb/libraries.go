package dynamodb

import (
	"context"
	"errors"
	"fmt"
	"time"

	"alexandria.isnan.eu/functions/internal/domain"
	"alexandria.isnan.eu/functions/internal/persistence"
	"alexandria.isnan.eu/functions/internal/slices"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/rs/zerolog/log"
)

func (d *dynamo) GetLibrary(ownerId string, libraryId string) (*domain.Library, error) {

	output, err := d.client.GetItem(context.TODO(), &dynamodb.GetItemInput{
		TableName: aws.String(tableName),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: persistence.MakeLibraryPK(ownerId)},
			"SK": &types.AttributeValueMemberS{Value: persistence.MakeLibrarySK(libraryId)},
		},
	})

	if err != nil {
		log.Error().Str("id", libraryId).Msgf("Unable to get library: %s", err.Error())
		return nil, errors.New("Unable to get library")
	}

	if output.Item == nil {
		log.Info().Str("id", libraryId).Msgf("Library %s does not exist for owner %s", libraryId, ownerId)
		return nil, errors.New("Unknown library")
	}

	record := persistence.Library{}
	if err := attributevalue.UnmarshalMap(output.Item, &record); err != nil {
		log.Warn().Msgf("Failed to unmarshal library: %s", err.Error())
		return nil, err
	}

	return &domain.Library{
			Id:          record.Id,
			Name:        record.Name,
			Description: record.Description,
			TotalItems:  record.TotalItems,
			UpdatedAt:   record.UpdatedAt,
			OwnerId:     record.OwnerId,
			OwnerName:   record.OwnerName,
			SharedTo:    record.SharedTo,
		},
		nil

}

func (d *dynamo) DeleteLibrary(l *domain.Library) error {

	// Get all items with PK=owner#<owner id> and SK begins with library#<library id>
	query := dynamodb.QueryInput{
		TableName:              aws.String(tableName),
		KeyConditionExpression: aws.String("#PK = :ownerId and begins_with(#SK,:library_sorting_key)"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":ownerId": &types.AttributeValueMemberS{
				Value: persistence.MakeLibraryPK(l.OwnerId),
			},
			":library_sorting_key": &types.AttributeValueMemberS{
				Value: persistence.MakeLibrarySK(l.Id),
			},
		},
		ExpressionAttributeNames: map[string]string{
			"#PK": "PK",
			"#SK": "SK",
		},
		Limit: aws.Int32(25),
	}

	type Record struct {
		PK string `dynamodbav:"PK"`
		SK string `dynamodbav:"SK"`
	}

	records := []types.WriteRequest{}
	queryPaginator := dynamodb.NewQueryPaginator(d.client, &query)
	for i := 0; queryPaginator.HasMorePages(); i++ {
		result, err := queryPaginator.NextPage(context.TODO())

		if err != nil {
			log.Error().Str("id", l.Id).Msgf("Failed to query records to delete: %s", err.Error())
			return err
		}

		if result.Count > 0 {
			for _, item := range result.Items {
				record := Record{}
				if err := attributevalue.UnmarshalMap(item, &record); err != nil {
					log.Warn().Msgf("Failed to unmarshal record: %s", err.Error())
					continue
				}

				records = append(records, types.WriteRequest{
					DeleteRequest: &types.DeleteRequest{
						Key: map[string]types.AttributeValue{
							"PK": &types.AttributeValueMemberS{Value: record.PK},
							"SK": &types.AttributeValueMemberS{Value: record.SK},
						},
					},
				})
			}
		}
	}

	chunks := slices.ChunkBy(records, 25)

	for _, c := range chunks {
		_, err := d.client.BatchWriteItem(context.TODO(), &dynamodb.BatchWriteItemInput{
			RequestItems: map[string][]types.WriteRequest{
				tableName: c,
			},
		})
		if err != nil {
			log.Warn().Str("id", l.Id).Msgf("Failed to batch delete records: %s", err.Error())
			continue
		}
	}

	return nil
}

func (d *dynamo) UpdateLibrary(l *domain.Library) error {

	_, err := d.client.UpdateItem(context.TODO(),
		&dynamodb.UpdateItemInput{
			TableName: aws.String(tableName),
			Key: map[string]types.AttributeValue{
				"PK": &types.AttributeValueMemberS{Value: persistence.MakeLibraryPK(l.OwnerId)},
				"SK": &types.AttributeValueMemberS{Value: persistence.MakeLibrarySK(l.Id)},
			},
			UpdateExpression:    aws.String("set LibraryName = :name, Description = :description, UpdatedAt = :updatedAt, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk"),
			ConditionExpression: aws.String("attribute_exists(PK)"),
			ExpressionAttributeValues: map[string]types.AttributeValue{
				":name":        &types.AttributeValueMemberS{Value: l.Name},
				":description": &types.AttributeValueMemberS{Value: l.Description},
				":updatedAt":   &types.AttributeValueMemberS{Value: l.UpdatedAt.Format(time.RFC3339Nano)},
				":gsi1pk":      &types.AttributeValueMemberS{Value: persistence.MakeLibraryGSI1PK(l.OwnerId)},
				":gsi1sk":      &types.AttributeValueMemberS{Value: persistence.MakeLibraryGSI1SK(l.Name)},
			},
		})

	if err != nil {
		log.Error().Str("id", l.Id).Msgf("Failed to update library: %s", err.Error())
		return err
	}

	return nil
}

func (d *dynamo) QueryLibraries(ownerId string) ([]domain.Library, error) {

	// Build the owned libraries list
	queryOwnLibraries := dynamodb.QueryInput{
		TableName:              aws.String(tableName),
		IndexName:              aws.String("GSI1"),
		KeyConditionExpression: aws.String("#GSI1PK = :ownerId and begins_with(#GSI1SK,:library_prefix)"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":ownerId": &types.AttributeValueMemberS{
				Value: persistence.MakeLibraryGSI1PK(ownerId),
			},
			":library_prefix": &types.AttributeValueMemberS{
				Value: "library#",
			},
		},
		ExpressionAttributeNames: map[string]string{
			"#GSI1PK": "GSI1PK",
			"#GSI1SK": "GSI1SK",
		},
	}

	queryPaginatorOwnLibraries := dynamodb.NewQueryPaginator(d.client, &queryOwnLibraries)

	records := []domain.Library{}
	for i := 0; queryPaginatorOwnLibraries.HasMorePages(); i++ {
		result, err := queryPaginatorOwnLibraries.NextPage(context.TODO())
		if err != nil {
			log.Error().Msgf("Failed to query libraries: %s", err.Error())
			return nil, err
		}

		if result.Count > 0 {
			for _, item := range result.Items {

				record := persistence.Library{}
				if err := attributevalue.UnmarshalMap(item, &record); err != nil {
					log.Warn().Msgf("Failed to unmarshal library: %s", err.Error())
					continue
				}

				records = append(records, domain.Library{
					Id:          record.Id,
					Name:        record.Name,
					Description: record.Description,
					TotalItems:  record.TotalItems,
					UpdatedAt:   record.UpdatedAt,
					OwnerName:   record.OwnerName,
					SharedTo:    record.SharedTo,
				})
			}
		}
	}

	// Build shared libraries list from other users
	querySharedLibraries := dynamodb.QueryInput{
		TableName:              aws.String(tableName),
		KeyConditionExpression: aws.String("#PK = :ownerId and begins_with(#SK,:shared_library_prefix)"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":ownerId": &types.AttributeValueMemberS{
				Value: persistence.MakeSharedLibraryPK(ownerId),
			},
			":shared_library_prefix": &types.AttributeValueMemberS{
				Value: "shared-library#",
			},
		},
		ExpressionAttributeNames: map[string]string{
			"#PK": "PK",
			"#SK": "SK",
		},
	}

	queryPaginatorSharedLibraries := dynamodb.NewQueryPaginator(d.client, &querySharedLibraries)

	type sharedLibraryIdentifier struct {
		LibraryId      string `dynamodbav:"LibraryId"`
		SharedFromId   string `dynamodbav:"SharedFromId"`
		SharedFromName string `dynamodbav:"SharedFromName"`
	}
	sharedLibrariesIdentifiers := map[string]sharedLibraryIdentifier{}
	for i := 0; queryPaginatorSharedLibraries.HasMorePages(); i++ {
		result, err := queryPaginatorSharedLibraries.NextPage(context.TODO())
		if err != nil {
			log.Error().Msgf("Failed to query shared libraries: %s", err.Error())
			return nil, err
		}

		if result.Count > 0 {
			for _, item := range result.Items {
				record := sharedLibraryIdentifier{}
				if err := attributevalue.UnmarshalMap(item, &record); err != nil {
					log.Warn().Msgf("Failed to unmarshal shared library id: %s", err.Error())
					continue
				}
				sharedLibrariesIdentifiers[record.LibraryId] = record
			}
		}
	}

	if len(sharedLibrariesIdentifiers) > 0 {
		var keys []map[string]types.AttributeValue
		for _, v := range sharedLibrariesIdentifiers {
			keys = append(keys, map[string]types.AttributeValue{
				"PK": &types.AttributeValueMemberS{Value: persistence.MakeLibraryPK(v.SharedFromId)},
				"SK": &types.AttributeValueMemberS{Value: persistence.MakeLibrarySK(v.LibraryId)},
			})
		}

		sharedLibraries, err := d.client.BatchGetItem(context.TODO(), &dynamodb.BatchGetItemInput{
			RequestItems: map[string]types.KeysAndAttributes{
				tableName: {
					Keys: keys,
				},
			},
		})

		if err != nil {
			log.Error().Msgf("Failed to fetch shared libraries: %s", err.Error())
			return nil, err
		}

		for _, v := range sharedLibraries.Responses {
			for _, v2 := range v {
				record := persistence.Library{}
				if err := attributevalue.UnmarshalMap(v2, &record); err != nil {
					log.Warn().Msgf("Failed to unmarshal shared library: %s", err.Error())
					continue
				}
				records = append(records, domain.Library{
					Id:          record.Id,
					Name:        record.Name,
					Description: record.Description,
					TotalItems:  record.TotalItems,
					UpdatedAt:   record.UpdatedAt,
					OwnerName:   record.OwnerName,
					SharedFrom:  aws.String(sharedLibrariesIdentifiers[record.Id].SharedFromName),
				})
			}
		}
	}

	return records, nil
}

func (d *dynamo) UnshareLibrary(s *domain.ShareLibrary) error {
	_, err := d.client.TransactWriteItems(context.TODO(), &dynamodb.TransactWriteItemsInput{
		TransactItems: []types.TransactWriteItem{
			{
				Delete: &types.Delete{
					TableName: aws.String(tableName),
					Key: map[string]types.AttributeValue{
						"PK": &types.AttributeValueMemberS{Value: persistence.MakeSharedLibraryPK(s.SharedToUserId)},
						"SK": &types.AttributeValueMemberS{Value: persistence.MakeSharedLibrarySK(s.LibraryId)},
					},
					ConditionExpression: aws.String("attribute_exists(PK) and attribute_exists(SK)"),
				},
			},
			{
				Update: &types.Update{
					TableName: aws.String(tableName),
					Key: map[string]types.AttributeValue{
						"PK": &types.AttributeValueMemberS{Value: persistence.MakeLibraryPK(s.SharedFromUserId)},
						"SK": &types.AttributeValueMemberS{Value: persistence.MakeLibrarySK(s.LibraryId)},
					},
					UpdateExpression: aws.String(fmt.Sprintf("REMOVE SharedTo[%d]", s.SharedToUserIndex)),
				},
			},
		},
	})

	if err != nil {
		log.Error().Str("libraryName", s.LibraryId).Msgf("Failed to unshare library: %s", err.Error())
		return err
	}
	return nil
}

func (d *dynamo) ShareLibrary(s *domain.ShareLibrary) error {

	record := persistence.SharedLibrary{
		PK:             persistence.MakeSharedLibraryPK(s.SharedToUserId),
		SK:             persistence.MakeSharedLibrarySK(s.LibraryId),
		LibraryId:      s.LibraryId,
		SharedToId:     s.SharedToUserId,
		SharedFromId:   s.SharedFromUserId,
		SharedFromName: s.SharedFromUserName,
		UpdatedAt:      s.UpdatedAt,
	}
	item, err := attributevalue.MarshalMap(record)
	if err != nil {
		log.Error().Str("libraryId", s.LibraryId).Msgf("Failed to marshal shared library: %s", err.Error())
		return err
	}

	sharedTo := types.AttributeValueMemberS{
		Value: s.SharedToUserName,
	}

	var sharedToList []types.AttributeValue
	sharedToList = append(sharedToList, &sharedTo)

	_, err = d.client.TransactWriteItems(context.TODO(), &dynamodb.TransactWriteItemsInput{
		TransactItems: []types.TransactWriteItem{
			{
				// Materialize the shared library
				Put: &types.Put{
					TableName: aws.String(tableName),
					Item:      item,
				},
			},
			{
				// Update the "SharedTo" attribute of the shared library
				Update: &types.Update{
					TableName: aws.String(tableName),
					Key: map[string]types.AttributeValue{
						"PK": &types.AttributeValueMemberS{Value: persistence.MakeLibraryPK(s.SharedFromUserId)},
						"SK": &types.AttributeValueMemberS{Value: persistence.MakeLibrarySK(s.LibraryId)},
					},
					UpdateExpression: aws.String("SET SharedTo = list_append(if_not_exists(SharedTo, :emptyList), :sharedTo)"),
					ExpressionAttributeValues: map[string]types.AttributeValue{
						":sharedTo": &types.AttributeValueMemberL{
							Value: sharedToList,
						},
						":emptyList": &types.AttributeValueMemberL{
							Value: []types.AttributeValue{},
						},
					},
				},
			},
		},
	})

	if err != nil {
		log.Error().Str("libraryName", s.LibraryId).Msgf("Failed to share library: %s", err.Error())
		return err
	}

	return nil
}

func (d *dynamo) PutLibrary(l *domain.Library) error {

	record := persistence.Library{
		PK:          persistence.MakeLibraryPK(l.OwnerId),
		SK:          persistence.MakeLibrarySK(l.Id),
		GSI1PK:      persistence.MakeLibraryGSI1PK(l.OwnerId),
		GSI1SK:      persistence.MakeLibraryGSI1SK(l.Name),
		Id:          l.Id,
		OwnerName:   l.OwnerName,
		OwnerId:     l.OwnerId,
		Name:        l.Name,
		Description: l.Description,
		TotalItems:  0,
		UpdatedAt:   l.UpdatedAt,
		SharedTo:    make([]string, 0),
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

func (d *dynamo) GetSharedLibrary(ownerId string, libraryId string) (string, error) {
	output, err := d.client.GetItem(context.TODO(), &dynamodb.GetItemInput{
		TableName: aws.String(tableName),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: persistence.MakeSharedLibraryPK(ownerId)},
			"SK": &types.AttributeValueMemberS{Value: persistence.MakeSharedLibrarySK(libraryId)},
		},
	})

	if err != nil {
		log.Error().Str("id", libraryId).Msgf("Unable to get shared library: %s", err.Error())
		return "", errors.New("Unable to get shared library")
	}

	if output.Item == nil {
		log.Info().Str("id", libraryId).Msgf("Shared Library %s does not exist for owner %s", libraryId, ownerId)
		return "", nil
	}

	record := persistence.SharedLibrary{}
	if err := attributevalue.UnmarshalMap(output.Item, &record); err != nil {
		log.Warn().Msgf("Failed to unmarshal library: %s", err.Error())
		return "", err
	}

	return record.SharedFromId, nil
}
