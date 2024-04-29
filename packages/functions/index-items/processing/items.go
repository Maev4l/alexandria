package processing

import (
	"slices"

	"alexandria.isnan.eu/functions/internal/domain"
	"alexandria.isnan.eu/functions/internal/persistence"
	ddbconversions "github.com/aereal/go-dynamodb-attribute-conversions/v2"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/rs/zerolog/log"
)

func UpdateItemHandler(db *domain.IndexDatabase, r *persistence.EventRecord) bool {
	atv_new := ddbconversions.AttributeValueMapFrom(r.DynamoDbStreamRecord.NewImage)
	var item_new persistence.LibraryItem
	_ = attributevalue.UnmarshalMap(atv_new, &item_new)

	atv_old := ddbconversions.AttributeValueMapFrom(r.DynamoDbStreamRecord.OldImage)
	var item_old persistence.LibraryItem
	_ = attributevalue.UnmarshalMap(atv_old, &item_old)

	if item_new.Title == item_old.Title && slices.Equal(item_new.Authors, item_old.Authors) {
		log.Info().Str("itemId", item_new.Id).Str("libraryId", item_new.LibraryId).Msg("Updated item not indexed. No modification to indexable fields.")
		// the modification is not related to the Tietle field or the Authors field
		return false
	}

	u, ok := db.Libraries[item_new.OwnerId]
	if !ok {
		// should not happen, as that means this item is added into a non-indexed user
		return false
	}

	l, ok := u[item_new.LibraryId]
	if !ok {
		// should not happen, as that means this item is added into a non-indexed library
		return false
	}

	i, ok := l.Items[item_new.Id]
	if !ok {
		// should not happen as that means, we are modifying an item belonging to a non indexed item
		return false
	}

	i.LibraryId = item_new.LibraryId
	i.Title = item_new.Title
	i.Authors = item_new.Authors

	log.Info().Str("itemId", item_new.Id).Str("libraryId", item_new.LibraryId).Msg("Indexed item updated.")
	return true
}

func DeleteItemHandler(db *domain.IndexDatabase, r *persistence.EventRecord) bool {
	atv := ddbconversions.AttributeValueMapFrom(r.DynamoDbStreamRecord.OldImage)
	var item persistence.LibraryItem
	_ = attributevalue.UnmarshalMap(atv, &item)

	u, ok := db.Libraries[item.OwnerId]
	if !ok {
		// should not happen, as that means this item is added into a non-indexed user
		return false
	}

	l, ok := u[item.LibraryId]
	if !ok {
		// should not happen, as that means this item is added into a non-indexed library
		return false
	}

	delete(l.Items, item.Id)

	log.Info().Str("itemId", item.Id).Str("libraryId", item.LibraryId).Msg("Deleted item removed from index.")
	return true
}

func NewItemHandler(db *domain.IndexDatabase, r *persistence.EventRecord) bool {
	atv := ddbconversions.AttributeValueMapFrom(r.DynamoDbStreamRecord.NewImage)
	var item persistence.LibraryItem
	_ = attributevalue.UnmarshalMap(atv, &item)

	u, ok := db.Libraries[item.OwnerId]
	if !ok {
		// should not happen, as that means this item is added into a non-indexed user
		return false
	}

	l, ok := u[item.LibraryId]
	if !ok {
		// should not happen, as that means this item is added into a non-indexed library
		return false
	}

	i := domain.IndexItem{
		PK:        item.PK,
		SK:        item.SK,
		Id:        item.Id,
		Type:      domain.ItemType(item.Type),
		LibraryId: item.LibraryId,
		OwnerId:   item.OwnerId,
		Title:     item.Title,
		Authors:   item.Authors,
	}

	l.Items[item.Id] = &i

	log.Info().Str("itemId", item.Id).Str("libraryId", item.LibraryId).Msg("New item indexed.")
	return true
}
