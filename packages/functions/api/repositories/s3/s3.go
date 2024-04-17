package storage

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"

	"os"

	"alexandria.isnan.eu/functions/internal/slices"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"github.com/aws/aws-sdk-go-v2/service/s3/types"

	"github.com/rs/zerolog/log"
)

var bucketName string = os.Getenv("S3_PICTURES_BUCKET")

type objectstorage struct {
	client *s3.Client
}

func NewObjectStorage(region string) *objectstorage {
	config, _ := config.LoadDefaultConfig(context.TODO(), config.WithRegion(region))
	client := s3.NewFromConfig(config)
	return &objectstorage{
		client: client,
	}
}

func (o *objectstorage) GetIndexes() ([]byte, error) {
	downloader := manager.NewDownloader(o.client)
	buf := manager.NewWriteAtBuffer([]byte{})

	_, err := downloader.Download(context.TODO(), buf, &s3.GetObjectInput{
		Bucket: aws.String(os.Getenv("S3_INDEX_BUCKET")),
		Key:    aws.String(os.Getenv("INDEX_FILE_NAME")),
	})

	if err != nil {
		var nsk *types.NoSuchKey
		if !errors.As(err, &nsk) {
			log.Error().Msgf("Unable to fetch index database: %s", err.Error())
			// Return an error so the messages are not deleted
			return nil, err
		}
		// indexes database has not been created yet
		return nil, nil
	}

	return buf.Bytes(), nil

}

func (o *objectstorage) DeletePictures(ownerId string, libraryId string) error {

	prefix := fmt.Sprintf("user/%s/library/%s", ownerId, libraryId)
	params := &s3.ListObjectsV2Input{
		Bucket:  aws.String(bucketName),
		MaxKeys: aws.Int32(1000),
		Prefix:  aws.String(prefix),
	}

	p := s3.NewListObjectsV2Paginator(o.client, params)
	var i int
	identifiers := []types.ObjectIdentifier{}
	for p.HasMorePages() {
		i++
		// Next Page takes a new context for each page retrieval. This is where
		// you could add timeouts or deadlines.
		page, err := p.NextPage(context.TODO())
		if err != nil {
			log.Warn().Str("prefix", prefix).Msgf("Failed to get page %d: %s", i, err.Error())
			continue
		}

		for _, obj := range page.Contents {
			identifiers = append(identifiers, types.ObjectIdentifier{Key: obj.Key})
		}
	}

	chunks := slices.ChunkBy(identifiers, 1000)

	for _, c := range chunks {

		_, err := o.client.DeleteObjects(context.TODO(), &s3.DeleteObjectsInput{
			Bucket: aws.String(bucketName),
			Delete: &types.Delete{
				Objects: c,
				Quiet:   aws.Bool(true),
			},
		})
		if err != nil {
			log.Warn().Str("prefix", prefix).Msgf("Failed to delete pictures: %s", err.Error())
			continue
		}
	}

	return nil
}

func (o *objectstorage) DeletePicture(ownerId string, libraryId string, itemId string) error {
	key := fmt.Sprintf("user/%s/library/%s/item/%s", ownerId, libraryId, itemId)

	_, err := o.client.DeleteObject(context.TODO(), &s3.DeleteObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(key),
	})

	if err != nil {
		var bne *types.NoSuchKey
		if errors.As(err, &bne) {
			// No such key error
			log.Warn().Str("key", key).Msg("Key does not exists.")
			return nil
		}
		log.Error().Str("key", key).Msgf("Failed to delete picture: %s", err.Error())
		return err
	}
	return nil
}

func (o *objectstorage) GetPicture(ownerId string, libraryId string, itemId string) ([]byte, error) {
	key := fmt.Sprintf("user/%s/library/%s/item/%s", ownerId, libraryId, itemId)

	output, err := o.client.GetObject(context.TODO(), &s3.GetObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(key),
	})

	if err != nil {
		var bne *types.NoSuchKey
		if errors.As(err, &bne) {
			// No such key error
			log.Warn().Str("key", key).Msg("Key does not exists.")
			return nil, nil
		}
		log.Error().Str("key", key).Msgf("Failed to download picture: %s", err.Error())
		return nil, err
	}

	defer output.Body.Close()
	b, err := io.ReadAll(output.Body)
	if err != nil {
		log.Error().Str("key", key).Msgf("Failed to read downloaded picture: %s", err.Error())
		return nil, err
	}

	return b, nil
}

func (o *objectstorage) PutPicture(ownerId string, libraryId string, itemId string, picture []byte) error {
	key := fmt.Sprintf("incoming/%s", itemId)

	_, err := o.client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:        aws.String(bucketName),
		Key:           aws.String(key),
		Body:          bytes.NewReader(picture),
		ContentLength: aws.Int64(int64(len(picture))),
		Metadata: map[string]string{
			"TargetPrefix": fmt.Sprintf("user/%s/library/%s/item/%s", ownerId, libraryId, itemId),
			"TargetWidth":  fmt.Sprintf("%d", 210),
			"TargetHeight": fmt.Sprintf("%d", 300),
		},
	})

	if err != nil {
		log.Error().Str("key", key).Msgf("Failed to upload picture: %s", err.Error())
		return err
	}
	return nil
}
