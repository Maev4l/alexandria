package main

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"

	"alexandria.isnan.eu/functions/internal/persistence"
	ddbconversions "github.com/aereal/go-dynamodb-attribute-conversions/v2"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	ddbtypes "github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/blugelabs/bluge"
	"github.com/rs/zerolog/log"
)

var s3Client *s3.Client
var ddbClient *dynamodb.Client

// ResyncEvent is the payload for manual full resync invocation
type ResyncEvent struct {
	Action string `json:"action"`
}

func init() {
	cfg, _ := config.LoadDefaultConfig(context.TODO(), config.WithRegion(os.Getenv("REGION")))
	s3Client = s3.NewFromConfig(cfg)
	ddbClient = dynamodb.NewFromConfig(cfg)
}

// SharedLibraryEntry represents a shared library for the shared-libraries.json file
type SharedLibraryEntry struct {
	OwnerId   string `json:"ownerId"`
	LibraryId string `json:"libraryId"`
}

// createBlugeDocument creates a Bluge document from a library item (book or video)
func createBlugeDocument(item *persistence.LibraryItem) *bluge.Document {
	docId := item.PK + "|" + item.SK
	doc := bluge.NewDocument(docId)

	// Text fields for fuzzy search
	doc.AddField(bluge.NewTextField("title", item.Title).StoreValue())

	// Authors field for books, directors and cast for videos
	if len(item.Authors) > 0 {
		doc.AddField(bluge.NewTextField("authors", strings.Join(item.Authors, " ")).StoreValue())
	}
	if len(item.Directors) > 0 {
		doc.AddField(bluge.NewTextField("directors", strings.Join(item.Directors, " ")).StoreValue())
	}
	if len(item.Cast) > 0 {
		doc.AddField(bluge.NewTextField("cast", strings.Join(item.Cast, " ")).StoreValue())
	}

	if item.Collection != nil && *item.Collection != "" {
		doc.AddField(bluge.NewTextField("collection", *item.Collection).StoreValue())
	}

	// Keyword fields for access filtering
	doc.AddField(bluge.NewKeywordField("ownerId", item.OwnerId).StoreValue())
	doc.AddField(bluge.NewKeywordField("libraryId", item.LibraryId).StoreValue())

	return doc
}

// untarDirectory extracts a tar.gz archive to a directory
func untarDirectory(archive *bytes.Buffer, destDir string) error {
	gzReader, err := gzip.NewReader(archive)
	if err != nil {
		return err
	}
	defer gzReader.Close()

	tarReader := tar.NewReader(gzReader)

	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}

		targetPath := filepath.Join(destDir, header.Name)

		switch header.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(targetPath, 0755); err != nil {
				return err
			}
		case tar.TypeReg:
			// Ensure parent directory exists
			if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
				return err
			}

			file, err := os.Create(targetPath)
			if err != nil {
				return err
			}

			if _, err := io.Copy(file, tarReader); err != nil {
				file.Close()
				return err
			}
			file.Close()
		}
	}

	return nil
}

// tarDirectory creates a tar.gz archive of a directory
func tarDirectory(sourceDir string) (*bytes.Buffer, error) {
	buf := new(bytes.Buffer)
	gzWriter := gzip.NewWriter(buf)
	tarWriter := tar.NewWriter(gzWriter)

	err := filepath.Walk(sourceDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Create tar header
		header, err := tar.FileInfoHeader(info, info.Name())
		if err != nil {
			return err
		}

		// Update name to be relative to sourceDir
		relPath, err := filepath.Rel(sourceDir, path)
		if err != nil {
			return err
		}
		header.Name = relPath

		if err := tarWriter.WriteHeader(header); err != nil {
			return err
		}

		// Write file content if it's a regular file
		if !info.IsDir() {
			file, err := os.Open(path)
			if err != nil {
				return err
			}
			defer file.Close()

			if _, err := io.Copy(tarWriter, file); err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	if err := tarWriter.Close(); err != nil {
		return nil, err
	}
	if err := gzWriter.Close(); err != nil {
		return nil, err
	}

	return buf, nil
}

// fullResync scans DynamoDB and rebuilds the entire Bluge index from scratch
func fullResync() error {
	log.Info().Msg("Starting full resync...")

	tableName := os.Getenv("DYNAMODB_TABLE_NAME")
	if tableName == "" {
		return errors.New("DYNAMODB_TABLE_NAME environment variable not set")
	}

	// Create temp directory for Bluge index
	indexDir, err := os.MkdirTemp("", "bluge-index-*")
	if err != nil {
		log.Error().Msgf("Failed to create temp directory: %s", err.Error())
		return err
	}
	defer os.RemoveAll(indexDir)

	// Create Bluge writer
	cfg := bluge.DefaultConfig(indexDir)
	writer, err := bluge.OpenWriter(cfg)
	if err != nil {
		log.Error().Msgf("Failed to create Bluge writer: %s", err.Error())
		return err
	}

	// Shared libraries map: sharedToId -> []SharedLibraryEntry
	sharedLibraries := map[string][]SharedLibraryEntry{}

	// Scan all items from DynamoDB
	var lastEvaluatedKey map[string]ddbtypes.AttributeValue
	totalBooks := 0
	totalSharedLibraries := 0

	batch := bluge.NewBatch()
	batchSize := 0
	const maxBatchSize = 100

	for {
		input := &dynamodb.ScanInput{
			TableName:         aws.String(tableName),
			ExclusiveStartKey: lastEvaluatedKey,
		}

		result, err := ddbClient.Scan(context.TODO(), input)
		if err != nil {
			writer.Close()
			log.Error().Msgf("Failed to scan DynamoDB: %s", err.Error())
			return err
		}

		for _, item := range result.Items {
			entityTypeAttr, ok := item["EntityType"]
			if !ok {
				continue
			}
			entityTypeStr, ok := entityTypeAttr.(*ddbtypes.AttributeValueMemberS)
			if !ok {
				continue
			}

			entityType := persistence.EntityType(entityTypeStr.Value)

			switch entityType {
			case persistence.TypeBook, persistence.TypeVideo:
				var libraryItem persistence.LibraryItem
				if err := attributevalue.UnmarshalMap(item, &libraryItem); err != nil {
					log.Warn().Msgf("Failed to unmarshal item: %s", err.Error())
					continue
				}

				doc := createBlugeDocument(&libraryItem)
				batch.Insert(doc)
				batchSize++
				totalBooks++ // Counts both books and videos

				// Flush batch periodically
				if batchSize >= maxBatchSize {
					if err := writer.Batch(batch); err != nil {
						log.Warn().Msgf("Failed to write batch: %s", err.Error())
					}
					batch.Reset()
					batchSize = 0
				}

			case persistence.TypeSharedLibrary:
				var shared persistence.SharedLibrary
				if err := attributevalue.UnmarshalMap(item, &shared); err != nil {
					log.Warn().Msgf("Failed to unmarshal shared library: %s", err.Error())
					continue
				}

				// Add to shared libraries map
				if _, ok := sharedLibraries[shared.SharedToId]; !ok {
					sharedLibraries[shared.SharedToId] = []SharedLibraryEntry{}
				}
				sharedLibraries[shared.SharedToId] = append(sharedLibraries[shared.SharedToId], SharedLibraryEntry{
					OwnerId:   shared.SharedFromId,
					LibraryId: shared.LibraryId,
				})
				totalSharedLibraries++
			}
		}

		lastEvaluatedKey = result.LastEvaluatedKey
		if lastEvaluatedKey == nil {
			break
		}
	}

	// Flush remaining batch
	if batchSize > 0 {
		if err := writer.Batch(batch); err != nil {
			log.Warn().Msgf("Failed to write final batch: %s", err.Error())
		}
	}

	// Close writer to flush index to disk
	if err := writer.Close(); err != nil {
		log.Error().Msgf("Failed to close Bluge writer: %s", err.Error())
		return err
	}

	log.Info().Msgf("Indexed %d books, %d shared libraries", totalBooks, totalSharedLibraries)

	// Create tar.gz of index directory
	indexArchive, err := tarDirectory(indexDir)
	if err != nil {
		log.Error().Msgf("Failed to create index archive: %s", err.Error())
		return err
	}

	// Upload index archive to S3
	uploader := manager.NewUploader(s3Client)
	_, err = uploader.Upload(context.TODO(), &s3.PutObjectInput{
		Bucket: aws.String(os.Getenv("S3_INDEX_BUCKET")),
		Key:    aws.String("indexes/global-index.tar.gz"),
		Body:   bytes.NewReader(indexArchive.Bytes()),
	})
	if err != nil {
		log.Error().Msgf("Failed to upload index archive: %s", err.Error())
		return err
	}

	// Upload shared-libraries.json to S3
	sharedLibrariesJSON, _ := json.MarshalIndent(sharedLibraries, "", "  ")
	_, err = uploader.Upload(context.TODO(), &s3.PutObjectInput{
		Bucket: aws.String(os.Getenv("S3_INDEX_BUCKET")),
		Key:    aws.String("indexes/shared-libraries.json"),
		Body:   bytes.NewReader(sharedLibrariesJSON),
	})
	if err != nil {
		log.Error().Msgf("Failed to upload shared-libraries.json: %s", err.Error())
		return err
	}

	log.Info().Msg("Full resync completed successfully")
	return nil
}

func streamHandler(event events.DynamoDBEvent) error {
	bucket := os.Getenv("S3_INDEX_BUCKET")
	downloader := manager.NewDownloader(s3Client)

	// Create temp directory for Bluge index
	indexDir, err := os.MkdirTemp("", "bluge-index-*")
	if err != nil {
		log.Error().Msgf("Failed to create temp directory: %s", err.Error())
		return err
	}
	defer os.RemoveAll(indexDir)

	// Download and extract existing Bluge index
	indexBuf := manager.NewWriteAtBuffer([]byte{})
	indexExists := true
	_, err = downloader.Download(context.TODO(), indexBuf, &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String("indexes/global-index.tar.gz"),
	})
	if err != nil {
		var nsk *types.NoSuchKey
		if !errors.As(err, &nsk) {
			log.Error().Msgf("Failed to download index: %s", err.Error())
			return err
		}
		indexExists = false
		log.Info().Msg("No existing index found, will create new one")
	}

	if indexExists {
		if err := untarDirectory(bytes.NewBuffer(indexBuf.Bytes()), indexDir); err != nil {
			log.Error().Msgf("Failed to extract index: %s", err.Error())
			return err
		}
	}

	// Download existing shared-libraries.json
	sharedLibraries := map[string][]SharedLibraryEntry{}
	sharedBuf := manager.NewWriteAtBuffer([]byte{})
	_, err = downloader.Download(context.TODO(), sharedBuf, &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String("indexes/shared-libraries.json"),
	})
	if err != nil {
		var nsk *types.NoSuchKey
		if !errors.As(err, &nsk) {
			log.Error().Msgf("Failed to download shared-libraries.json: %s", err.Error())
			return err
		}
		// File doesn't exist yet, start with empty map
	} else {
		if err := json.Unmarshal(sharedBuf.Bytes(), &sharedLibraries); err != nil {
			log.Warn().Msgf("Failed to parse shared-libraries.json: %s", err.Error())
		}
	}

	// Open Bluge writer
	cfg := bluge.DefaultConfig(indexDir)
	writer, err := bluge.OpenWriter(cfg)
	if err != nil {
		log.Error().Msgf("Failed to open Bluge writer: %s", err.Error())
		return err
	}

	indexModified := false
	sharedModified := false

	// Process stream events
	for _, record := range event.Records {
		var entityType persistence.EntityType
		if record.EventName == "REMOVE" {
			entityType = persistence.EntityType(record.Change.OldImage["EntityType"].String())
		} else {
			entityType = persistence.EntityType(record.Change.NewImage["EntityType"].String())
		}

		switch entityType {
		case persistence.TypeBook, persistence.TypeVideo:
			switch record.EventName {
			case "INSERT":
				var item persistence.LibraryItem
				atv := ddbconversions.AttributeValueMapFrom(record.Change.NewImage)
				if err := attributevalue.UnmarshalMap(atv, &item); err != nil {
					log.Warn().Msgf("Failed to unmarshal item: %s", err.Error())
					continue
				}
				doc := createBlugeDocument(&item)
				if err := writer.Insert(doc); err != nil {
					log.Warn().Msgf("Failed to insert document: %s", err.Error())
					continue
				}
				indexModified = true
				log.Info().Str("itemId", item.Id).Str("type", string(entityType)).Msg("Item indexed")

			case "MODIFY":
				var itemOld, itemNew persistence.LibraryItem
				atvOld := ddbconversions.AttributeValueMapFrom(record.Change.OldImage)
				atvNew := ddbconversions.AttributeValueMapFrom(record.Change.NewImage)
				_ = attributevalue.UnmarshalMap(atvOld, &itemOld)
				if err := attributevalue.UnmarshalMap(atvNew, &itemNew); err != nil {
					log.Warn().Msgf("Failed to unmarshal item: %s", err.Error())
					continue
				}

				// Only reindex if searchable fields changed
				// For books: title, authors, collection
				// For videos: title, directors, cast, collection
				if itemNew.Title == itemOld.Title &&
					strings.Join(itemNew.Authors, " ") == strings.Join(itemOld.Authors, " ") &&
					strings.Join(itemNew.Directors, " ") == strings.Join(itemOld.Directors, " ") &&
					strings.Join(itemNew.Cast, " ") == strings.Join(itemOld.Cast, " ") &&
					((itemNew.Collection == nil && itemOld.Collection == nil) ||
						(itemNew.Collection != nil && itemOld.Collection != nil && *itemNew.Collection == *itemOld.Collection)) {
					continue
				}

				// Delete old and insert new
				docId := itemOld.PK + "|" + itemOld.SK
				if err := writer.Delete(bluge.Identifier(docId)); err != nil {
					log.Warn().Msgf("Failed to delete old document: %s", err.Error())
				}
				doc := createBlugeDocument(&itemNew)
				if err := writer.Insert(doc); err != nil {
					log.Warn().Msgf("Failed to insert updated document: %s", err.Error())
					continue
				}
				indexModified = true
				log.Info().Str("itemId", itemNew.Id).Str("type", string(entityType)).Msg("Item reindexed")

			case "REMOVE":
				var item persistence.LibraryItem
				atv := ddbconversions.AttributeValueMapFrom(record.Change.OldImage)
				if err := attributevalue.UnmarshalMap(atv, &item); err != nil {
					log.Warn().Msgf("Failed to unmarshal item: %s", err.Error())
					continue
				}
				docId := item.PK + "|" + item.SK
				if err := writer.Delete(bluge.Identifier(docId)); err != nil {
					log.Warn().Msgf("Failed to delete document: %s", err.Error())
					continue
				}
				indexModified = true
				log.Info().Str("itemId", item.Id).Str("type", string(entityType)).Msg("Item removed from index")
			}

		case persistence.TypeSharedLibrary:
			switch record.EventName {
			case "INSERT":
				var shared persistence.SharedLibrary
				atv := ddbconversions.AttributeValueMapFrom(record.Change.NewImage)
				if err := attributevalue.UnmarshalMap(atv, &shared); err != nil {
					log.Warn().Msgf("Failed to unmarshal shared library: %s", err.Error())
					continue
				}
				if _, ok := sharedLibraries[shared.SharedToId]; !ok {
					sharedLibraries[shared.SharedToId] = []SharedLibraryEntry{}
				}
				sharedLibraries[shared.SharedToId] = append(sharedLibraries[shared.SharedToId], SharedLibraryEntry{
					OwnerId:   shared.SharedFromId,
					LibraryId: shared.LibraryId,
				})
				sharedModified = true
				log.Info().Str("libraryId", shared.LibraryId).Str("sharedTo", shared.SharedToId).Msg("Shared library added")

			case "REMOVE":
				var shared persistence.SharedLibrary
				atv := ddbconversions.AttributeValueMapFrom(record.Change.OldImage)
				if err := attributevalue.UnmarshalMap(atv, &shared); err != nil {
					log.Warn().Msgf("Failed to unmarshal shared library: %s", err.Error())
					continue
				}
				if entries, ok := sharedLibraries[shared.SharedToId]; ok {
					filtered := []SharedLibraryEntry{}
					for _, e := range entries {
						if e.LibraryId != shared.LibraryId {
							filtered = append(filtered, e)
						}
					}
					if len(filtered) == 0 {
						delete(sharedLibraries, shared.SharedToId)
					} else {
						sharedLibraries[shared.SharedToId] = filtered
					}
					sharedModified = true
					log.Info().Str("libraryId", shared.LibraryId).Str("sharedTo", shared.SharedToId).Msg("Shared library removed")
				}
			}
		}
	}

	// Close writer
	if err := writer.Close(); err != nil {
		log.Error().Msgf("Failed to close Bluge writer: %s", err.Error())
		return err
	}

	// Upload if modified
	uploader := manager.NewUploader(s3Client)

	if indexModified {
		indexArchive, err := tarDirectory(indexDir)
		if err != nil {
			log.Error().Msgf("Failed to create index archive: %s", err.Error())
			return err
		}
		_, err = uploader.Upload(context.TODO(), &s3.PutObjectInput{
			Bucket: aws.String(bucket),
			Key:    aws.String("indexes/global-index.tar.gz"),
			Body:   bytes.NewReader(indexArchive.Bytes()),
		})
		if err != nil {
			log.Error().Msgf("Failed to upload index: %s", err.Error())
			return err
		}
		log.Info().Msg("Bluge index uploaded")
	}

	if sharedModified {
		sharedJSON, _ := json.MarshalIndent(sharedLibraries, "", "  ")
		_, err = uploader.Upload(context.TODO(), &s3.PutObjectInput{
			Bucket: aws.String(bucket),
			Key:    aws.String("indexes/shared-libraries.json"),
			Body:   bytes.NewReader(sharedJSON),
		})
		if err != nil {
			log.Error().Msgf("Failed to upload shared-libraries.json: %s", err.Error())
			return err
		}
		log.Info().Msg("shared-libraries.json uploaded")
	}

	return nil
}

// handler detects event type and routes to appropriate handler
func handler(ctx context.Context, rawEvent json.RawMessage) error {
	// Try to parse as ResyncEvent first
	var resyncEvent ResyncEvent
	if err := json.Unmarshal(rawEvent, &resyncEvent); err == nil && resyncEvent.Action == "fullResync" {
		return fullResync()
	}

	// Otherwise, parse as DynamoDB stream event
	var ddbEvent events.DynamoDBEvent
	if err := json.Unmarshal(rawEvent, &ddbEvent); err != nil {
		log.Error().Msgf("Failed to parse event: %s", err.Error())
		return err
	}

	return streamHandler(ddbEvent)
}

func main() {
	lambda.Start(handler)
}
