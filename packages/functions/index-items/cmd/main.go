package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"os"
	"strings"

	"alexandria.isnan.eu/functions/internal/domain"
	"alexandria.isnan.eu/functions/internal/persistence"
	"alexandria.isnan.eu/functions/internal/slices"
	ddbconversions "github.com/aereal/go-dynamodb-attribute-conversions/v2"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/rs/zerolog/log"
)

var client *s3.Client

func init() {

	config, _ := config.LoadDefaultConfig(context.TODO(), config.WithRegion(os.Getenv("REGION")))
	client = s3.NewFromConfig(config)
}

func processEventRecord(db *domain.IndexDatabase, b string) bool {
	log.Info().Msgf("Payload: %s", b)
	var r persistence.EventRecord
	err := json.Unmarshal([]byte(b), &r)
	if err != nil {
		log.Error().Msgf("Failed to unmarshall event payload (%s): %s", b, err.Error())
		return false
	}

	if r.EventName == "INSERT" {
		isLibrary := strings.HasPrefix(r.DynamoDbStreamRecord.Keys["SK"].String(), "library") && !strings.Contains(r.DynamoDbStreamRecord.Keys["SK"].String(), "#item")
		if isLibrary {
			atv := ddbconversions.AttributeValueMapFrom(r.DynamoDbStreamRecord.NewImage)
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
			return true
		}

		// Handle case an item is added
		isItem := strings.Contains(r.DynamoDbStreamRecord.Keys["SK"].String(), "#item")
		if isItem {
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

			return true
		}

		// Handle case a library is shared
		isSharedLibrary := strings.HasPrefix(r.DynamoDbStreamRecord.Keys["SK"].String(), "shared-library")
		if isSharedLibrary {
			atv := ddbconversions.AttributeValueMapFrom(r.DynamoDbStreamRecord.NewImage)
			var sh persistence.SharedLibrary
			_ = attributevalue.UnmarshalMap(atv, &sh)

			isl := domain.IndexSharedLibrary{
				OwnerId:   sh.SharedFromId,
				LibraryId: sh.LibraryId,
			}

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
	}

	if r.EventName == "MODIFY" {

		isItem := strings.Contains(r.DynamoDbStreamRecord.Keys["SK"].String(), "#item")
		if isItem {
			atv_new := ddbconversions.AttributeValueMapFrom(r.DynamoDbStreamRecord.NewImage)
			var item_new persistence.LibraryItem
			_ = attributevalue.UnmarshalMap(atv_new, &item_new)

			atv_old := ddbconversions.AttributeValueMapFrom(r.DynamoDbStreamRecord.OldImage)
			var item_old persistence.LibraryItem
			_ = attributevalue.UnmarshalMap(atv_old, &item_old)

			if item_new.Title == item_old.Title && slices.Equal(item_new.Authors, item_old.Authors) {
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

			return true
		}

	}

	if r.EventName == "REMOVE" {

		// Handle case where a library is deleted
		isLibrary := strings.HasPrefix(r.DynamoDbStreamRecord.Keys["SK"].String(), "library") && !strings.Contains(r.DynamoDbStreamRecord.Keys["SK"].String(), "#item")
		if isLibrary {
			atv := ddbconversions.AttributeValueMapFrom(r.DynamoDbStreamRecord.OldImage)
			var library persistence.Library
			_ = attributevalue.UnmarshalMap(atv, &library)

			u, ok := db.Libraries[library.OwnerId]
			if !ok {
				// should not happen, as that means this item is added into a non-indexed user
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
			return true
		}

		// Handle case where a book is deleted
		isItem := strings.Contains(r.DynamoDbStreamRecord.Keys["SK"].String(), "#item")
		if isItem {
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

			return true
		}

		// Handle case where a library is unshared
		isSharedLibrary := strings.HasPrefix(r.DynamoDbStreamRecord.Keys["SK"].String(), "shared-library")
		if isSharedLibrary {
			atv := ddbconversions.AttributeValueMapFrom(r.DynamoDbStreamRecord.OldImage)
			var sh persistence.SharedLibrary
			_ = attributevalue.UnmarshalMap(atv, &sh)

			u, ok := db.UsersToSharedLibraries[sh.SharedToId]
			if !ok {
				// Should not happen, as that means we unshare a library whose sharing has not been indexed
				return false
			}
			delete(u, sh.LibraryId)
			// Remove entry for this user, if no libraries are shared with him/her
			if len(db.UsersToSharedLibraries[sh.SharedToId]) == 0 {
				delete(db.UsersToSharedLibraries, sh.SharedToId)
			}
			return true
		}

	}

	return false
}

func handler(event events.SQSEvent) error {

	downloader := manager.NewDownloader(client)
	buf := manager.NewWriteAtBuffer([]byte{})

	_, err := downloader.Download(context.TODO(), buf, &s3.GetObjectInput{
		Bucket: aws.String(os.Getenv("S3_INDEX_BUCKET")),
		Key:    aws.String(os.Getenv("INDEX_FILE_NAME")),
	})

	databaseExists := true
	if err != nil {
		var nsk *types.NoSuchKey
		if !errors.As(err, &nsk) {
			log.Error().Msgf("Unable to fetch index database: %s", err.Error())
			// Return an error so the messages are not deleted
			return err
		}
		databaseExists = false
	}

	indexes := domain.IndexDatabase{
		Libraries:              map[string]map[string]*domain.IndexLibrary{},
		UsersToSharedLibraries: map[string]map[string]domain.IndexSharedLibrary{},
	}

	if databaseExists {
		err = json.Unmarshal(buf.Bytes(), &indexes)
		if err != nil {
			log.Error().Msgf("Failed to load index database: %s", err.Error())
			return nil
		}
		// log.Debug().Msg("Index database loaded")
	}

	databaseModified := false
	for _, r := range event.Records {
		databaseModified = databaseModified || processEventRecord(&indexes, r.Body)
	}

	if !databaseModified {
		// log.Debug().Msg("No updates to index database")
		return nil
	}

	j, _ := json.MarshalIndent(indexes, "", "  ")

	uploader := manager.NewUploader(client)
	uploader.Upload(context.TODO(), &s3.PutObjectInput{
		Bucket: aws.String(os.Getenv("S3_INDEX_BUCKET")),
		Key:    aws.String(os.Getenv("INDEX_FILE_NAME")),
		Body:   bytes.NewReader(j),
	})

	log.Debug().Msg("Index database saved")

	return nil
}

func main() {
	lambda.Start(handler)
}
