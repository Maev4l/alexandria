package storage

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"alexandria.isnan.eu/functions/api/ports"
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

// untarDirectory extracts a tar.gz archive to a directory
func untarDirectory(archive []byte, destDir string) error {
	gzReader, err := gzip.NewReader(bytes.NewReader(archive))
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

func (o *objectstorage) GetBlugeIndex() (string, func(), error) {
	downloader := manager.NewDownloader(o.client)
	buf := manager.NewWriteAtBuffer([]byte{})

	_, err := downloader.Download(context.TODO(), buf, &s3.GetObjectInput{
		Bucket: aws.String(os.Getenv("S3_INDEX_BUCKET")),
		Key:    aws.String(fmt.Sprintf("indexes/%s", os.Getenv("GLOBAL_INDEX_FILE_NAME"))),
	})

	if err != nil {
		var nsk *types.NoSuchKey
		if !errors.As(err, &nsk) {
			log.Error().Msgf("Unable to fetch Bluge index: %s", err.Error())
			return "", nil, err
		}
		// Index doesn't exist yet
		return "", nil, nil
	}

	// Create temp directory and extract
	indexDir, err := os.MkdirTemp("", "bluge-search-*")
	if err != nil {
		log.Error().Msgf("Failed to create temp directory: %s", err.Error())
		return "", nil, err
	}

	cleanup := func() {
		os.RemoveAll(indexDir)
	}

	if err := untarDirectory(buf.Bytes(), indexDir); err != nil {
		cleanup()
		log.Error().Msgf("Failed to extract index: %s", err.Error())
		return "", nil, err
	}

	return indexDir, cleanup, nil
}

func (o *objectstorage) GetSharedLibraries() (map[string][]ports.SharedLibraryEntry, error) {
	downloader := manager.NewDownloader(o.client)
	buf := manager.NewWriteAtBuffer([]byte{})

	_, err := downloader.Download(context.TODO(), buf, &s3.GetObjectInput{
		Bucket: aws.String(os.Getenv("S3_INDEX_BUCKET")),
		Key:    aws.String(fmt.Sprintf("indexes/%s", os.Getenv("SHARE_LIBRARIES_FILE_NAME"))),
	})

	if err != nil {
		var nsk *types.NoSuchKey
		if !errors.As(err, &nsk) {
			log.Error().Msgf("Unable to fetch shared libraries: %s", err.Error())
			return nil, err
		}
		// File doesn't exist yet, return empty map
		return map[string][]ports.SharedLibraryEntry{}, nil
	}

	var sharedLibraries map[string][]ports.SharedLibraryEntry
	if err := json.Unmarshal(buf.Bytes(), &sharedLibraries); err != nil {
		log.Error().Msgf("Failed to parse shared libraries: %s", err.Error())
		return nil, err
	}

	return sharedLibraries, nil
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

	defer func() { _ = output.Body.Close() }()
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
