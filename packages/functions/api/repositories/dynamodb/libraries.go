package dynamodb

import (
	"context"

	"alexandria.isnan.eu/functions/api/domain"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/rs/zerolog/log"
)

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
