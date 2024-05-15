package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"os"

	"alexandria.isnan.eu/functions/index-items/processing"
	"alexandria.isnan.eu/functions/internal/domain"
	"alexandria.isnan.eu/functions/internal/persistence"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/rs/zerolog/log"
)

var client *s3.Client

var handlers map[string]map[persistence.EntityType]processing.Handler

func init() {

	config, _ := config.LoadDefaultConfig(context.TODO(), config.WithRegion(os.Getenv("REGION")))
	client = s3.NewFromConfig(config)

	handlers = map[string]map[persistence.EntityType]processing.Handler{
		"INSERT": {
			persistence.TypeLibrary:      processing.NewLibraryHandler,
			persistence.TypeBook:         processing.NewItemHandler,
			persistence.TypSharedLibrary: processing.NewSharedLibraryHandler,
		},

		"MODIFY": {
			persistence.TypeBook: processing.UpdateItemHandler,
		},
		"REMOVE": {
			persistence.TypeLibrary:      processing.DeleteLibraryHandler,
			persistence.TypeBook:         processing.DeleteItemHandler,
			persistence.TypSharedLibrary: processing.DeleteSharedLibraryHandler,
		},
	}
}

func processEventRecord(db *domain.IndexDatabase, evt events.DynamoDBEventRecord) bool {

	hs, ok := handlers[evt.EventName]
	if !ok {
		log.Error().Msgf("Unknown event name: %s", evt.EventName)
		return false
	}

	var entityType persistence.EntityType
	if evt.EventName == "REMOVE" {
		entityType = persistence.EntityType(evt.Change.OldImage["EntityType"].String())
	} else {
		entityType = persistence.EntityType(evt.Change.NewImage["EntityType"].String())
	}

	handler, ok := hs[entityType]
	if !ok {
		log.Error().Msgf("Unregistered entity type: %s", entityType)
		return false
	}

	return handler(db, &evt)

}

func handler(event events.DynamoDBEvent) error {

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
	// b, _ := json.Marshal(&event)
	// log.Info().Msgf("Event: %s", string(b))
	for _, r := range event.Records {
		databaseModified = databaseModified || processEventRecord(&indexes, r)
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
