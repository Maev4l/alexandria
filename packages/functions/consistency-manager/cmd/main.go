package main

import (
	"context"
	"os"

	"alexandria.isnan.eu/functions/consistency-manager/processing"
	"alexandria.isnan.eu/functions/internal/persistence"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/rs/zerolog/log"
)

var client *dynamodb.Client
var handlers map[string]map[persistence.EntityType]processing.Handler

var region string = os.Getenv("REGION")

func init() {
	config, _ := config.LoadDefaultConfig(context.TODO(), config.WithRegion(region))
	client = dynamodb.NewFromConfig(config)

	handlers = map[string]map[persistence.EntityType]processing.Handler{
		"MODIFY": {
			persistence.TypeLibrary: processing.UpdateLibraryHandler,
		},
	}
}

func processEventRecord(evt events.DynamoDBEventRecord) {

	hs, ok := handlers[evt.EventName]
	if !ok {
		log.Error().Msgf("Unknown event name: %s", evt.EventName)
		return
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
		return
	}

	handler(client, &evt)
}

func handler(event events.DynamoDBEvent) error {

	for _, r := range event.Records {
		processEventRecord(r)
	}
	return nil
}

func main() {
	lambda.Start(handler)
}
