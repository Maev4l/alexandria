// Edited by Claude.
package dynamodb

import (
	"context"
	"errors"
	"strconv"

	"alexandria.isnan.eu/functions/internal/domain"
	"alexandria.isnan.eu/functions/internal/persistence"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/rs/zerolog/log"
)

// GetCollection retrieves a collection by ID
func (d *dynamo) GetCollection(ownerId string, libraryId string, collectionId string) (*domain.Collection, error) {
	output, err := d.client.GetItem(context.TODO(), &dynamodb.GetItemInput{
		TableName: aws.String(tableName),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: persistence.MakeCollectionPK(ownerId)},
			"SK": &types.AttributeValueMemberS{Value: persistence.MakeCollectionSK(libraryId, collectionId)},
		},
	})

	if err != nil {
		log.Error().Str("id", collectionId).Msgf("Unable to get collection: %s", err.Error())
		return nil, errors.New("unable to get collection")
	}

	if output.Item == nil {
		log.Info().Str("id", collectionId).Msgf("Collection %s does not exist", collectionId)
		return nil, nil
	}

	record := persistence.Collection{}
	if err := attributevalue.UnmarshalMap(output.Item, &record); err != nil {
		log.Warn().Msgf("Failed to unmarshal collection: %s", err.Error())
		return nil, err
	}

	return &domain.Collection{
		Id:          record.Id,
		Name:        record.Name,
		Description: record.Description,
		ItemCount:   record.ItemCount,
		OwnerId:     record.OwnerId,
		LibraryId:   record.LibraryId,
		CreatedAt:   record.CreatedAt,
		UpdatedAt:   record.UpdatedAt,
	}, nil
}

// GetCollectionByName retrieves a collection by name within a library (for uniqueness check)
func (d *dynamo) GetCollectionByName(ownerId string, libraryId string, name string) (*domain.Collection, error) {
	query := dynamodb.QueryInput{
		TableName:              aws.String(tableName),
		IndexName:              aws.String("GSI1"),
		KeyConditionExpression: aws.String("#GSI1PK = :gsi1pk AND #GSI1SK = :gsi1sk"),
		ExpressionAttributeNames: map[string]string{
			"#GSI1PK": "GSI1PK",
			"#GSI1SK": "GSI1SK",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":gsi1pk": &types.AttributeValueMemberS{
				Value: persistence.MakeCollectionGSI1PK(ownerId, libraryId),
			},
			":gsi1sk": &types.AttributeValueMemberS{
				Value: persistence.MakeCollectionGSI1SK(name),
			},
		},
		Limit: aws.Int32(1),
	}

	result, err := d.client.Query(context.TODO(), &query)
	if err != nil {
		log.Error().Str("name", name).Msgf("Failed to query collection by name: %s", err.Error())
		return nil, err
	}

	if result.Count == 0 {
		return nil, nil
	}

	record := persistence.Collection{}
	if err := attributevalue.UnmarshalMap(result.Items[0], &record); err != nil {
		log.Warn().Msgf("Failed to unmarshal collection: %s", err.Error())
		return nil, err
	}

	return &domain.Collection{
		Id:          record.Id,
		Name:        record.Name,
		Description: record.Description,
		ItemCount:   record.ItemCount,
		OwnerId:     record.OwnerId,
		LibraryId:   record.LibraryId,
		CreatedAt:   record.CreatedAt,
		UpdatedAt:   record.UpdatedAt,
	}, nil
}

// QueryCollectionsByLibrary returns all collections in a library
func (d *dynamo) QueryCollectionsByLibrary(ownerId string, libraryId string) ([]domain.Collection, error) {
	query := dynamodb.QueryInput{
		TableName:              aws.String(tableName),
		IndexName:              aws.String("GSI1"),
		KeyConditionExpression: aws.String("#GSI1PK = :gsi1pk AND begins_with(#GSI1SK, :prefix)"),
		ExpressionAttributeNames: map[string]string{
			"#GSI1PK": "GSI1PK",
			"#GSI1SK": "GSI1SK",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":gsi1pk": &types.AttributeValueMemberS{
				Value: persistence.MakeCollectionGSI1PK(ownerId, libraryId),
			},
			":prefix": &types.AttributeValueMemberS{
				Value: "collection#",
			},
		},
	}

	queryPaginator := dynamodb.NewQueryPaginator(d.client, &query)
	collections := []domain.Collection{}

	for queryPaginator.HasMorePages() {
		result, err := queryPaginator.NextPage(context.TODO())
		if err != nil {
			log.Error().Str("libraryId", libraryId).Msgf("Failed to query collections: %s", err.Error())
			return nil, err
		}

		for _, item := range result.Items {
			record := persistence.Collection{}
			if err := attributevalue.UnmarshalMap(item, &record); err != nil {
				log.Warn().Msgf("Failed to unmarshal collection: %s", err.Error())
				continue
			}

			collections = append(collections, domain.Collection{
				Id:          record.Id,
				Name:        record.Name,
				Description: record.Description,
				ItemCount:   record.ItemCount,
				OwnerId:     record.OwnerId,
				LibraryId:   record.LibraryId,
				CreatedAt:   record.CreatedAt,
				UpdatedAt:   record.UpdatedAt,
			})
		}
	}

	return collections, nil
}

// PutCollection creates a new collection
func (d *dynamo) PutCollection(c *domain.Collection) error {
	record := persistence.Collection{
		PK:          persistence.MakeCollectionPK(c.OwnerId),
		SK:          persistence.MakeCollectionSK(c.LibraryId, c.Id),
		GSI1PK:      persistence.MakeCollectionGSI1PK(c.OwnerId, c.LibraryId),
		GSI1SK:      persistence.MakeCollectionGSI1SK(c.Name),
		Id:          c.Id,
		Name:        c.Name,
		Description: c.Description,
		ItemCount:   0,
		OwnerId:     c.OwnerId,
		LibraryId:   c.LibraryId,
		CreatedAt:   c.CreatedAt,
		UpdatedAt:   c.UpdatedAt,
		EntityType:  persistence.TypeCollection,
	}

	item, err := attributevalue.MarshalMap(record)
	if err != nil {
		log.Error().Str("name", c.Name).Msgf("Failed to marshal collection: %s", err.Error())
		return err
	}

	_, err = d.client.PutItem(context.TODO(), &dynamodb.PutItemInput{
		TableName: aws.String(tableName),
		Item:      item,
	})

	if err != nil {
		log.Error().Str("name", c.Name).Msgf("Failed to put collection: %s", err.Error())
		return err
	}

	return nil
}

// UpdateCollection updates an existing collection
func (d *dynamo) UpdateCollection(c *domain.Collection) error {
	_, err := d.client.UpdateItem(context.TODO(), &dynamodb.UpdateItemInput{
		TableName: aws.String(tableName),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: persistence.MakeCollectionPK(c.OwnerId)},
			"SK": &types.AttributeValueMemberS{Value: persistence.MakeCollectionSK(c.LibraryId, c.Id)},
		},
		UpdateExpression:    aws.String("SET CollectionName = :name, Description = :description, UpdatedAt = :updatedAt, GSI1SK = :gsi1sk"),
		ConditionExpression: aws.String("attribute_exists(PK)"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":name":        &types.AttributeValueMemberS{Value: c.Name},
			":description": &types.AttributeValueMemberS{Value: c.Description},
			":updatedAt":   &types.AttributeValueMemberS{Value: c.UpdatedAt.Format("2006-01-02T15:04:05.999999999Z07:00")},
			":gsi1sk":      &types.AttributeValueMemberS{Value: persistence.MakeCollectionGSI1SK(c.Name)},
		},
	})

	if err != nil {
		log.Error().Str("id", c.Id).Msgf("Failed to update collection: %s", err.Error())
		return err
	}

	return nil
}

// DeleteCollection removes a collection
func (d *dynamo) DeleteCollection(c *domain.Collection) error {
	_, err := d.client.DeleteItem(context.TODO(), &dynamodb.DeleteItemInput{
		TableName: aws.String(tableName),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: persistence.MakeCollectionPK(c.OwnerId)},
			"SK": &types.AttributeValueMemberS{Value: persistence.MakeCollectionSK(c.LibraryId, c.Id)},
		},
		ConditionExpression: aws.String("attribute_exists(PK) and attribute_exists(SK)"),
	})

	if err != nil {
		log.Error().Str("id", c.Id).Msgf("Failed to delete collection: %s", err.Error())
		return err
	}

	return nil
}

// IncrementCollectionItemCount atomically updates the ItemCount of a collection
func (d *dynamo) IncrementCollectionItemCount(ownerId string, libraryId string, collectionId string, delta int) error {
	_, err := d.client.UpdateItem(context.TODO(), &dynamodb.UpdateItemInput{
		TableName: aws.String(tableName),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: persistence.MakeCollectionPK(ownerId)},
			"SK": &types.AttributeValueMemberS{Value: persistence.MakeCollectionSK(libraryId, collectionId)},
		},
		UpdateExpression: aws.String("ADD ItemCount :delta"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":delta": &types.AttributeValueMemberN{Value: strconv.Itoa(delta)},
		},
	})

	if err != nil {
		log.Error().Str("collectionId", collectionId).Msgf("Failed to update collection item count: %s", err.Error())
		return err
	}

	return nil
}
