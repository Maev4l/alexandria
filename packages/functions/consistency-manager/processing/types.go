package processing

import (
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

var tableName string = os.Getenv("DYNAMODB_TABLE_NAME")

type Handler func(client *dynamodb.Client, evt *events.DynamoDBEventRecord)
