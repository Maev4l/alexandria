package storage

import (
	"bytes"
	"context"
	"fmt"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
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

func (o *objectstorage) PutPicture(ownerId string, libraryId string, itemId string, picture []byte) error {
	o.client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:        aws.String(bucketName),
		Key:           aws.String(fmt.Sprintf("incoming/%s", itemId)),
		Body:          bytes.NewReader(picture),
		ContentLength: aws.Int64(int64(len(picture))),
		Metadata: map[string]string{
			"TargetPrefix": fmt.Sprintf("user/%s/library/%s/item/%s", ownerId, libraryId, itemId),
			"TargetWidth":  fmt.Sprintf("%d", 210),
			"TargetHeight": fmt.Sprintf("%d", 300),
		},
	})
	return nil
}
