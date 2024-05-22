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

func UpdateLibraryHandler(client *dynamodb.Client, evt *events.DynamoDBEventRecord) {

	atv_new := ddbconversions.AttributeValueMapFrom(evt.Change.NewImage)
	var library_new persistence.Library
	_ = attributevalue.UnmarshalMap(atv_new, &library_new)

	atv_old := ddbconversions.AttributeValueMapFrom(evt.Change.OldImage)
	var library_old persistence.Library
	_ = attributevalue.UnmarshalMap(atv_old, &library_old)

	if library_new.Name == library_old.Name {
		// No need to update the LibraryName field for the items belonging to the updated library
		return
	}

	// Get all items belonging to this library
	query := dynamodb.QueryInput{
		TableName:              aws.String(tableName),
		IndexName:              aws.String("GSI1"),
		KeyConditionExpression: aws.String("#GSI1PK = :gsi1pk and begins_with(#GSI1SK,:library_item_prefix)"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":gsi1pk": &types.AttributeValueMemberS{
				Value: persistence.MakeLibraryItemGSI1PK(library_new.OwnerId, library_new.Id),
			},
			":library_item_prefix": &types.AttributeValueMemberS{
				Value: "item#",
			},
		},
		ExpressionAttributeNames: map[string]string{
			"#GSI1PK": "GSI1PK",
			"#GSI1SK": "GSI1SK",
		},
	}

	queryPaginatorLibraryItems := dynamodb.NewQueryPaginator(client, &query)

	requests := []types.BatchStatementRequest{}

	for i := 0; queryPaginatorLibraryItems.HasMorePages(); i++ {
		result, err := queryPaginatorLibraryItems.NextPage(context.TODO())
		if err != nil {
			log.Error().Msgf("Failed to query library items: %s", err.Error())
			return
		}

		if result.Count > 0 {
			for _, item := range result.Items {
				record := persistence.LibraryItem{}

				if err := attributevalue.UnmarshalMap(item, &record); err != nil {
					log.Warn().Str("libraryId", library_new.Id).Msgf("Failed to unmarshal library item: %s", err.Error())
				}
				params, _ := attributevalue.MarshalList([]interface{}{
					library_new.Name,
					persistence.MakeLibraryItemPK(record.OwnerId),
					persistence.MakeLibraryItemSK(record.LibraryId, record.Id)})

				requests = append(requests, types.BatchStatementRequest{
					Statement:  aws.String(fmt.Sprintf("UPDATE \"%s\" SET LibraryName=? WHERE PK=? AND SK=?", tableName)),
					Parameters: params,
				})
			}
		}
	}

	chunks := slices.ChunkBy(requests, 25)

	for _, c := range chunks {
		_, err := client.BatchExecuteStatement(context.TODO(), &dynamodb.BatchExecuteStatementInput{
			Statements: c,
		})
		if err != nil {
			log.Warn().Str("libraryId", library_new.Id).Msgf("Failed to batch update library name for items: %s", err.Error())
			continue
		}
	}
}
