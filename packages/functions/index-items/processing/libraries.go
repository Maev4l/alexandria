package processing

import (
	"alexandria.isnan.eu/functions/internal/domain"
	"alexandria.isnan.eu/functions/internal/persistence"
	ddbconversions "github.com/aereal/go-dynamodb-attribute-conversions/v2"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/rs/zerolog/log"
)

func NewLibraryHandler(db *domain.IndexDatabase, evt *events.DynamoDBEventRecord) bool {
	atv := ddbconversions.AttributeValueMapFrom(evt.Change.NewImage)
	var library persistence.Library
	_ = attributevalue.UnmarshalMap(atv, &library)

	_, ok := db.Libraries[library.OwnerId]
	if !ok {
		db.Libraries[library.OwnerId] = map[string]*domain.IndexLibrary{}
	}

	db.Libraries[library.OwnerId][library.Id] = &domain.IndexLibrary{
		Id:    library.Id,
		Items: map[string]*domain.IndexItem{},
	}
	log.Info().Str("libraryId", library.Id).Msg("New library indexed.")
	return true
}

func DeleteLibraryHandler(db *domain.IndexDatabase, evt *events.DynamoDBEventRecord) bool {
	atv := ddbconversions.AttributeValueMapFrom(evt.Change.OldImage)
	var library persistence.Library
	_ = attributevalue.UnmarshalMap(atv, &library)

	u, ok := db.Libraries[library.OwnerId]
	if !ok {
		// should not happen, as that means this library was added into a non-indexed user
		log.Warn().Str("ownerId", library.OwnerId).Str("libraryId", library.Id).Msg("No owner found for deleted library.")
		return false
	}

	delete(u, library.Id)
	// remove entry for this user, when he has no libraries
	if len(u) == 0 {
		delete(db.Libraries, library.OwnerId)
	}

	// Remove sharing information as well if any (should not happen as it is not possible to remove a shared library)
	for _, u := range db.UsersToSharedLibraries {
		for k := range u {
			if k == library.Id {
				delete(u, k)
			}
		}
	}
	log.Info().Str("libraryId", library.Id).Msg("Deleted library removed from index.")
	return true
}

func NewSharedLibraryHandler(db *domain.IndexDatabase, evt *events.DynamoDBEventRecord) bool {
	atv := ddbconversions.AttributeValueMapFrom(evt.Change.NewImage)
	var sh persistence.SharedLibrary
	_ = attributevalue.UnmarshalMap(atv, &sh)

	isl := domain.IndexSharedLibrary{
		OwnerId:   sh.SharedFromId,
		LibraryId: sh.LibraryId,
	}

	log.Info().Str("libraryId", sh.LibraryId).Msg("New shared library indexed.")

	s, ok := db.UsersToSharedLibraries[sh.SharedToId]
	if ok {
		s[sh.LibraryId] = isl
		return true
	}

	db.UsersToSharedLibraries[sh.SharedToId] = map[string]domain.IndexSharedLibrary{
		sh.LibraryId: isl,
	}

	return true
}

func DeleteSharedLibraryHandler(db *domain.IndexDatabase, evt *events.DynamoDBEventRecord) bool {
	atv := ddbconversions.AttributeValueMapFrom(evt.Change.OldImage)
	var sh persistence.SharedLibrary
	_ = attributevalue.UnmarshalMap(atv, &sh)

	u, ok := db.UsersToSharedLibraries[sh.SharedToId]
	if !ok {
		// Should not happen, as that means we unshare a library whose sharing has not been indexed
		log.Warn().Str("sharedToId", sh.SharedToId).Str("libraryId", sh.LibraryId).Msg("No owner found for deleted shared library.")
		return false
	}
	delete(u, sh.LibraryId)
	// Remove entry for this user, if no libraries are shared with him/her
	if len(db.UsersToSharedLibraries[sh.SharedToId]) == 0 {
		delete(db.UsersToSharedLibraries, sh.SharedToId)
	}

	log.Info().Str("libraryId", sh.LibraryId).Msg("Unshared library removed from index.")
	return true
}
