package persistence

import (
	"github.com/aws/aws-lambda-go/events"
)

type EventRecord struct {
	EventName            string                      `json:"eventName"`
	DynamoDbStreamRecord events.DynamoDBStreamRecord `json:"dynamodb"`
}
