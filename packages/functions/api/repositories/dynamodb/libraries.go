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

func (d *dynamo) PutLibraryItem(i *domain.LibraryItem) error {
	record := LibraryItem{
		PK:          makeLibraryItemPK(i.OwnerId),
		SK:          makeLibraryItemSK(i.Id),
		GSI1PK:      makeLibraryItemGSI1PK(i.OwnerId, i.LibraryId),
		GSI1SK:      makeLibraryItemGSI1SK(i.Title),
		Id:          i.Id,
		OwnerName:   i.OwnerName,
		OwnerId:     i.OwnerId,
		Title:       i.Title,
		Summary:     i.Summary,
		UpdatedAt:   i.UpdatedAt,
		LibraryId:   i.LibraryId,
		LibraryName: i.LibraryName,
		Authors:     i.Authors,
		Isbn:        i.Isbn,
		Type:        int(i.Type),
	}

	item, err := attributevalue.MarshalMap(record)
	if err != nil {
		log.Error().Str("title", i.Title).Msgf("Failed to marshal item: %s", err.Error())
		return err
	}

	_, err = d.client.TransactWriteItems(context.TODO(), &dynamodb.TransactWriteItemsInput{
		TransactItems: []types.TransactWriteItem{
			// Insert the library item
			{
				Put: &types.Put{
					TableName: aws.String(tableName),
					Item:      item,
				},
			},
			// Increment TotalItems attribute of the library by 1
			{
				Update: &types.Update{
					TableName: aws.String(tableName),
					Key: map[string]types.AttributeValue{
						"PK": &types.AttributeValueMemberS{Value: makeLibraryPK(i.OwnerId)},
						"SK": &types.AttributeValueMemberS{Value: makeLibrarySK(i.LibraryId)},
					},
					UpdateExpression: aws.String("SET TotalItems = TotalItems + :incr"),
					ExpressionAttributeValues: map[string]types.AttributeValue{
						":incr": &types.AttributeValueMemberN{
							Value: "1",
						},
					},
				},
			},
		},
	})

	if err != nil {
		log.Error().Str("title", i.Title).Msgf("Failed to put item: %s", err.Error())
		return err
	}

	return nil
}

func (d *dynamo) GetLibrary(ownerId string, libraryId string) (*domain.Library, error) {

	output, err := d.client.GetItem(context.TODO(), &dynamodb.GetItemInput{
		TableName: aws.String(tableName),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: makeLibraryPK(ownerId)},
			"SK": &types.AttributeValueMemberS{Value: makeLibrarySK(libraryId)},
		},
	})

	if err != nil {
		log.Error().Str("id", libraryId).Msgf("Unable to get library: %s", err.Error())
		return nil, errors.New("Unable to get library")
	}

	if output.Item == nil {
		log.Info().Str("id", libraryId).Msgf("Library %s does not exist for owner %s", libraryId, ownerId)
		return nil, errors.New("Uknown library")
	}

	record := Library{}
	if err := attributevalue.UnmarshalMap(output.Item, &record); err != nil {
		log.Warn().Msgf("Failed to unmarshal library: %s", err.Error())
		return nil, err
	}

	return &domain.Library{Id: record.Id,
		Name:        record.Name,
		Description: record.Description,
		TotalItems:  record.TotalItems,
		UpdatedAt:   record.UpdatedAt,
		OwnerName:   record.OwnerName}, nil

}

func (d *dynamo) QueryLibraryItems(ownerId string, libraryId string, continuationToken string, pageSize int) (*domain.LibraryContent, error) {
	query := dynamodb.QueryInput{
		TableName:              aws.String(tableName),
		IndexName:              aws.String("GSI1"),
		KeyConditionExpression: aws.String("#GSI1PK = :gsi1pk and begins_with(#GSI1SK,:library_item_prefix)"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":gsi1pk": &types.AttributeValueMemberS{
				Value: makeLibraryItemGSI1PK(ownerId, libraryId),
			},
			":library_item_prefix": &types.AttributeValueMemberS{
				Value: "item#",
			},
		},
		ExpressionAttributeNames: map[string]string{
			"#GSI1PK": "GSI1PK",
			"#GSI1SK": "GSI1SK",
		},
		Limit: aws.Int32(int32(pageSize)),
	}

	if continuationToken != "" {
		lek, err := deserializeLek(continuationToken)
		if err != nil {
			log.Error().Str("id", libraryId).Msg("Unable to deserialize continuation token")
			return nil, errors.New("Unable to deserialize continuation token")
		}

		query.ExclusiveStartKey = lek
	}

	result, err := d.client.Query(context.TODO(), &query)
	if err != nil {
		log.Error().Str("id", libraryId).Msgf("Failed to query library items: %s", err.Error())
		return nil, err
	}

	items := []domain.LibraryItem{}
	for _, item := range result.Items {

		record := LibraryItem{}
		if err := attributevalue.UnmarshalMap(item, &record); err != nil {
			log.Warn().Str("id", libraryId).Msgf("Failed to unmarshal library item: %s", err.Error())
		}

		items = append(items, domain.LibraryItem{
			Id:          record.Id,
			Title:       record.Title,
			OwnerId:     record.OwnerId,
			OwnerName:   record.OwnerName,
			LibraryId:   record.LibraryId,
			LibraryName: record.LibraryName,
			Summary:     record.Summary,
			Authors:     record.Authors,
			Isbn:        record.Isbn,
			UpdatedAt:   record.UpdatedAt,
			Type:        domain.ItemType(record.Type),
		})
	}

	content := &domain.LibraryContent{
		Items: items,
	}

	if result.LastEvaluatedKey != nil {
		nextToken, err := serializeLek(result.LastEvaluatedKey)
		if err != nil {
			log.Error().Str("id", libraryId).Msg("Unable to serialize continuation token")
			return nil, errors.New("Unable to serialize continuation token")
		}
		content.ContinuationToken = *nextToken
	}

	return content, nil
}

func (d *dynamo) DeleteLibrary(l *domain.Library) error {
	result, err := d.client.DeleteItem(context.TODO(), &dynamodb.DeleteItemInput{
		TableName: aws.String(tableName),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: makeLibraryPK(l.OwnerId)},
			"SK": &types.AttributeValueMemberS{Value: makeLibrarySK(l.Id)},
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
				"PK": &types.AttributeValueMemberS{Value: makeLibraryPK(l.OwnerId)},
				"SK": &types.AttributeValueMemberS{Value: makeLibrarySK(l.Id)},
			},
			UpdateExpression:    aws.String("set LibraryName = :name, Description = :description, UpdatedAt = :updatedAt, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk"),
			ConditionExpression: aws.String("attribute_exists(PK)"),
			ExpressionAttributeValues: map[string]types.AttributeValue{
				":name":        &types.AttributeValueMemberS{Value: l.Name},
				":description": &types.AttributeValueMemberS{Value: l.Description},
				":updatedAt":   &types.AttributeValueMemberS{Value: l.UpdatedAt.Format(time.RFC3339Nano)},
				":gsi1pk":      &types.AttributeValueMemberS{Value: makeLibraryGSI1PK(l.OwnerId)},
				":gsi1sk":      &types.AttributeValueMemberS{Value: makeLibraryGSI1SK(l.Name)},
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
		IndexName:              aws.String("GSI1"),
		KeyConditionExpression: aws.String("#GSI1PK = :ownerId and begins_with(#GSI1SK,:library_prefix)"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":ownerId": &types.AttributeValueMemberS{
				Value: makeLibraryGSI1PK(ownerId),
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
		PK:          makeLibraryPK(l.OwnerId),
		SK:          makeLibrarySK(l.Id),
		GSI1PK:      makeLibraryGSI1PK(l.OwnerId),
		GSI1SK:      makeLibraryGSI1SK(l.Name),
		Id:          l.Id,
		OwnerName:   l.OwnerName,
		OwnerId:     l.OwnerId,
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
