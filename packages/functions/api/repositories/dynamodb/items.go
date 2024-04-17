package dynamodb

import (
	"context"
	"errors"

	"alexandria.isnan.eu/functions/internal/domain"
	"alexandria.isnan.eu/functions/internal/persistence"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/expression"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/rs/zerolog/log"
)

func (d *dynamo) GetMatchedItems(matchedKeys []domain.IndexItem) ([]*domain.LibraryItem, error) {
	var keys []map[string]types.AttributeValue
	for _, v := range matchedKeys {
		log.Info().Msgf("Matched item: PK: %s - SK: %s", v.PK, v.SK)
		keys = append(keys, map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: v.PK},
			"SK": &types.AttributeValueMemberS{Value: v.SK},
		})
	}

	result := []*domain.LibraryItem{}
	if len(keys) > 0 {
		res, err := d.client.BatchGetItem(context.TODO(), &dynamodb.BatchGetItemInput{
			RequestItems: map[string]types.KeysAndAttributes{
				tableName: {
					Keys: keys,
				},
			},
		})

		if err != nil {
			log.Error().Msgf("Failed to fetch matched items: %s", err.Error())
			return nil, err
		}

		for _, v := range res.Responses {
			for _, v2 := range v {
				record := persistence.LibraryItem{}
				if err := attributevalue.UnmarshalMap(v2, &record); err != nil {
					log.Warn().Msgf("Failed to unmarshal matched library item: %s", err.Error())
				}

				result = append(result, &domain.LibraryItem{
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
					PictureUrl:  record.PictureUrl,
				})
			}

		}
	}

	return result, nil
}

func (d *dynamo) DeleteLibraryItem(i *domain.LibraryItem) error {

	_, err := d.client.TransactWriteItems(context.TODO(), &dynamodb.TransactWriteItemsInput{
		TransactItems: []types.TransactWriteItem{
			// Remove the library item
			{
				Delete: &types.Delete{
					TableName: aws.String(tableName),
					Key: map[string]types.AttributeValue{
						"PK": &types.AttributeValueMemberS{Value: persistence.MakeLibraryItemPK(i.OwnerId)},
						"SK": &types.AttributeValueMemberS{Value: persistence.MakeLibraryItemSK(i.LibraryId, i.Id)},
					},
					ConditionExpression: aws.String("attribute_exists(PK) and attribute_exists(SK)"),
				},
			},
			// Decrement TotalItems attribute of the library by 1
			{
				Update: &types.Update{
					TableName: aws.String(tableName),
					Key: map[string]types.AttributeValue{
						"PK": &types.AttributeValueMemberS{Value: persistence.MakeLibraryPK(i.OwnerId)},
						"SK": &types.AttributeValueMemberS{Value: persistence.MakeLibrarySK(i.LibraryId)},
					},
					UpdateExpression: aws.String("SET TotalItems = TotalItems - :decr"),
					ExpressionAttributeValues: map[string]types.AttributeValue{
						":decr": &types.AttributeValueMemberN{
							Value: "1",
						},
					},
				},
			},
		},
	})

	if err != nil {
		log.Error().Str("id", i.Id).Msgf("Failed to delete item: %s", err.Error())
		return err
	}

	return nil
}

func (d *dynamo) UpdateLibraryItem(i *domain.LibraryItem) error {

	upd := expression.Set(expression.Name("Title"), expression.Value(i.Title)).
		Set(expression.Name("Summary"), expression.Value(i.Summary)).
		Set(expression.Name("Authors"), expression.Value(i.Authors)).
		Set(expression.Name("Isbn"), expression.Value(i.Isbn)).
		Set(expression.Name("UpdatedAt"), expression.Value(i.UpdatedAt)).
		Set(expression.Name("GSI1SK"), expression.Value(persistence.MakeLibraryItemGSI1SK(i.Title))).
		Set(expression.Name("GSI2SK"), expression.Value(persistence.MakeLibraryItemGSI2SK(i.Title))).
		Set(expression.Name("PictureUrl"), expression.Value(i.PictureUrl))

	expr, _ := expression.NewBuilder().WithUpdate(upd).Build()

	_, err := d.client.UpdateItem(context.TODO(), &dynamodb.UpdateItemInput{
		TableName: aws.String(tableName),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: persistence.MakeLibraryItemPK(i.OwnerId)},
			"SK": &types.AttributeValueMemberS{Value: persistence.MakeLibraryItemSK(i.LibraryId, i.Id)},
		},

		ConditionExpression:       aws.String("attribute_exists(PK) and attribute_exists(SK)"),
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
		UpdateExpression:          expr.Update(),
	})

	if err != nil {
		return err
	}

	return nil
}

func (d *dynamo) PutLibraryItem(i *domain.LibraryItem) error {
	record := persistence.LibraryItem{
		PK:          persistence.MakeLibraryItemPK(i.OwnerId),
		SK:          persistence.MakeLibraryItemSK(i.LibraryId, i.Id),
		GSI1PK:      persistence.MakeLibraryItemGSI1PK(i.OwnerId, i.LibraryId),
		GSI1SK:      persistence.MakeLibraryItemGSI1SK(i.Title),
		GSI2PK:      persistence.MakeLibraryItemGSI2PK(i.OwnerId),
		GSI2SK:      persistence.MakeLibraryItemGSI2SK(i.Title),
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
		PictureUrl:  i.PictureUrl,
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
						"PK": &types.AttributeValueMemberS{Value: persistence.MakeLibraryPK(i.OwnerId)},
						"SK": &types.AttributeValueMemberS{Value: persistence.MakeLibrarySK(i.LibraryId)},
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

func (d *dynamo) QueryItemsByLibrary(ownerId string, libraryId string, continuationToken string, pageSize int) (*domain.LibraryContent, error) {
	query := dynamodb.QueryInput{
		TableName:              aws.String(tableName),
		IndexName:              aws.String("GSI1"),
		KeyConditionExpression: aws.String("#GSI1PK = :gsi1pk and begins_with(#GSI1SK,:library_item_prefix)"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":gsi1pk": &types.AttributeValueMemberS{
				Value: persistence.MakeLibraryItemGSI1PK(ownerId, libraryId),
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
		lek, err := persistence.DeserializeLek(continuationToken)
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

	items := []*domain.LibraryItem{}
	for _, item := range result.Items {

		record := persistence.LibraryItem{}
		if err := attributevalue.UnmarshalMap(item, &record); err != nil {
			log.Warn().Str("id", libraryId).Msgf("Failed to unmarshal library item: %s", err.Error())
		}

		items = append(items, &domain.LibraryItem{
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
			PictureUrl:  record.PictureUrl,
		})
	}

	content := &domain.LibraryContent{
		Items: items,
	}

	if result.LastEvaluatedKey != nil {
		nextToken, err := persistence.SerializeLek(result.LastEvaluatedKey)
		if err != nil {
			log.Error().Str("id", libraryId).Msg("Unable to serialize continuation token")
			return nil, errors.New("Unable to serialize continuation token")
		}
		content.ContinuationToken = *nextToken
	}

	return content, nil
}
