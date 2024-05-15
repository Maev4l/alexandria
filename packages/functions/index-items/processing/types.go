package processing

import (
	"alexandria.isnan.eu/functions/internal/domain"
	"github.com/aws/aws-lambda-go/events"
)

type Handler func(db *domain.IndexDatabase, evt *events.DynamoDBEventRecord) bool
