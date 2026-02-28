// Edited by Claude.
package processing

import (
	"context"
	"fmt"

	"alexandria.isnan.eu/functions/internal/persistence"
	"alexandria.isnan.eu/functions/internal/slices"
	ddbconversions "github.com/aereal/go-dynamodb-attribute-conversions/v2"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/rs/zerolog/log"
)

// UpdateCollectionHandler handles MODIFY events for COLLECTION entities
// When a collection is renamed:
// 1. Updates the collection's own GSI1SK to the new name
// 2. Updates CollectionName and GSI1SK on all items in that collection
func UpdateCollectionHandler(client *dynamodb.Client, evt *events.DynamoDBEventRecord) {
	atv_new := ddbconversions.AttributeValueMapFrom(evt.Change.NewImage)
	var collection_new persistence.Collection
	_ = attributevalue.UnmarshalMap(atv_new, &collection_new)

	atv_old := ddbconversions.AttributeValueMapFrom(evt.Change.OldImage)
	var collection_old persistence.Collection
	_ = attributevalue.UnmarshalMap(atv_old, &collection_old)

	// Only proceed if name changed
	if collection_new.Name == collection_old.Name {
		return
	}

	log.Info().Str("collectionId", collection_new.Id).Msgf("Collection renamed from '%s' to '%s'", collection_old.Name, collection_new.Name)

	// Step 1: Update the collection entity's own GSI1SK (already done via UpdateCollection in API)
	// The API updates GSI1SK when updating the collection, but we verify it here for safety
	newCollectionGSI1SK := persistence.MakeCollectionGSI1SK(collection_new.Name)
	if collection_new.GSI1SK != newCollectionGSI1SK {
		log.Warn().Str("collectionId", collection_new.Id).Msg("Collection GSI1SK not updated by API, updating via stream")
		_, err := client.UpdateItem(context.TODO(), &dynamodb.UpdateItemInput{
			TableName: aws.String(tableName),
			Key: map[string]types.AttributeValue{
				"PK": &types.AttributeValueMemberS{Value: collection_new.PK},
				"SK": &types.AttributeValueMemberS{Value: collection_new.SK},
			},
			UpdateExpression: aws.String("SET GSI1SK = :gsi1sk"),
			ExpressionAttributeValues: map[string]types.AttributeValue{
				":gsi1sk": &types.AttributeValueMemberS{Value: newCollectionGSI1SK},
			},
		})
		if err != nil {
			log.Error().Str("collectionId", collection_new.Id).Msgf("Failed to update collection GSI1SK: %s", err.Error())
		}
	}

	// Step 2: Update all items in this collection

	// Query all items in this collection using GSI1
	// Items have GSI1PK = owner#<ownerId>#library#<libraryId> and CollectionId = collectionId
	query := dynamodb.QueryInput{
		TableName:              aws.String(tableName),
		IndexName:              aws.String("GSI1"),
		KeyConditionExpression: aws.String("#GSI1PK = :gsi1pk and begins_with(#GSI1SK, :item_prefix)"),
		FilterExpression:       aws.String("#CollectionId = :collectionId"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":gsi1pk": &types.AttributeValueMemberS{
				Value: persistence.MakeLibraryItemGSI1PK(collection_new.OwnerId, collection_new.LibraryId),
			},
			":item_prefix": &types.AttributeValueMemberS{
				Value: "item#",
			},
			":collectionId": &types.AttributeValueMemberS{
				Value: collection_new.Id,
			},
		},
		ExpressionAttributeNames: map[string]string{
			"#GSI1PK":       "GSI1PK",
			"#GSI1SK":       "GSI1SK",
			"#CollectionId": "CollectionId",
		},
	}

	queryPaginator := dynamodb.NewQueryPaginator(client, &query)
	requests := []types.BatchStatementRequest{}

	for queryPaginator.HasMorePages() {
		result, err := queryPaginator.NextPage(context.TODO())
		if err != nil {
			log.Error().Str("collectionId", collection_new.Id).Msgf("Failed to query items in collection: %s", err.Error())
			return
		}

		for _, item := range result.Items {
			record := persistence.LibraryItem{}
			if err := attributevalue.UnmarshalMap(item, &record); err != nil {
				log.Warn().Str("collectionId", collection_new.Id).Msgf("Failed to unmarshal item: %s", err.Error())
				continue
			}

			// Compute new GSI1SK with the new collection name
			newGSI1SK := persistence.MakeLibraryItemGSI1SK(record.Title, &collection_new.Name, record.Order)

			params, _ := attributevalue.MarshalList([]interface{}{
				collection_new.Name,
				newGSI1SK,
				persistence.MakeLibraryItemPK(record.OwnerId),
				persistence.MakeLibraryItemSK(record.LibraryId, record.Id),
			})

			requests = append(requests, types.BatchStatementRequest{
				Statement:  aws.String(fmt.Sprintf("UPDATE \"%s\" SET CollectionName=?, GSI1SK=? WHERE PK=? AND SK=?", tableName)),
				Parameters: params,
			})
		}
	}

	if len(requests) == 0 {
		log.Info().Str("collectionId", collection_new.Id).Msg("No items found in collection to update")
		return
	}

	// Execute batch updates in chunks of 25
	chunks := slices.ChunkBy(requests, 25)
	for _, chunk := range chunks {
		_, err := client.BatchExecuteStatement(context.TODO(), &dynamodb.BatchExecuteStatementInput{
			Statements: chunk,
		})
		if err != nil {
			log.Warn().Str("collectionId", collection_new.Id).Msgf("Failed to batch update items: %s", err.Error())
			continue
		}
	}

	log.Info().Str("collectionId", collection_new.Id).Msgf("Updated %d items with new collection name", len(requests))
}

// DeleteCollectionHandler handles REMOVE events for COLLECTION entities
// When a collection is deleted, orphans all items by setting CollectionId, CollectionName, Order to null
func DeleteCollectionHandler(client *dynamodb.Client, evt *events.DynamoDBEventRecord) {
	atv_old := ddbconversions.AttributeValueMapFrom(evt.Change.OldImage)
	var collection persistence.Collection
	_ = attributevalue.UnmarshalMap(atv_old, &collection)

	log.Info().Str("collectionId", collection.Id).Msg("Collection deleted, orphaning items")

	// Query all items in this collection
	query := dynamodb.QueryInput{
		TableName:              aws.String(tableName),
		IndexName:              aws.String("GSI1"),
		KeyConditionExpression: aws.String("#GSI1PK = :gsi1pk and begins_with(#GSI1SK, :item_prefix)"),
		FilterExpression:       aws.String("#CollectionId = :collectionId"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":gsi1pk": &types.AttributeValueMemberS{
				Value: persistence.MakeLibraryItemGSI1PK(collection.OwnerId, collection.LibraryId),
			},
			":item_prefix": &types.AttributeValueMemberS{
				Value: "item#",
			},
			":collectionId": &types.AttributeValueMemberS{
				Value: collection.Id,
			},
		},
		ExpressionAttributeNames: map[string]string{
			"#GSI1PK":       "GSI1PK",
			"#GSI1SK":       "GSI1SK",
			"#CollectionId": "CollectionId",
		},
	}

	queryPaginator := dynamodb.NewQueryPaginator(client, &query)
	requests := []types.BatchStatementRequest{}

	for queryPaginator.HasMorePages() {
		result, err := queryPaginator.NextPage(context.TODO())
		if err != nil {
			log.Error().Str("collectionId", collection.Id).Msgf("Failed to query items in collection: %s", err.Error())
			return
		}

		for _, item := range result.Items {
			record := persistence.LibraryItem{}
			if err := attributevalue.UnmarshalMap(item, &record); err != nil {
				log.Warn().Str("collectionId", collection.Id).Msgf("Failed to unmarshal item: %s", err.Error())
				continue
			}

			// Compute new GSI1SK without collection (just title)
			newGSI1SK := persistence.MakeLibraryItemGSI1SK(record.Title, nil, nil)

			params, _ := attributevalue.MarshalList([]interface{}{
				newGSI1SK,
				persistence.MakeLibraryItemPK(record.OwnerId),
				persistence.MakeLibraryItemSK(record.LibraryId, record.Id),
			})

			// Set CollectionId, CollectionName, Order to NULL
			requests = append(requests, types.BatchStatementRequest{
				Statement:  aws.String(fmt.Sprintf("UPDATE \"%s\" SET CollectionId=NULL, CollectionName=NULL, \"Order\"=NULL, GSI1SK=? WHERE PK=? AND SK=?", tableName)),
				Parameters: params,
			})
		}
	}

	if len(requests) == 0 {
		log.Info().Str("collectionId", collection.Id).Msg("No items found in collection to orphan")
		return
	}

	// Execute batch updates in chunks of 25
	chunks := slices.ChunkBy(requests, 25)
	for _, chunk := range chunks {
		_, err := client.BatchExecuteStatement(context.TODO(), &dynamodb.BatchExecuteStatementInput{
			Statements: chunk,
		})
		if err != nil {
			log.Warn().Str("collectionId", collection.Id).Msgf("Failed to batch orphan items: %s", err.Error())
			continue
		}
	}

	log.Info().Str("collectionId", collection.Id).Msgf("Orphaned %d items from deleted collection", len(requests))
}
