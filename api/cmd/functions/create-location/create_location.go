package main

import (
	"net/http"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"isnan.eu/alexandria/api/internal/transport"
)

func handler(event events.APIGatewayProxyRequest) (*events.APIGatewayProxyResponse, error) {
	log.Info().Msgf("Event %v", event)

	return transport.MakeResponse(http.StatusOK, event)
}

func main() {
	zerolog.SetGlobalLevel(zerolog.InfoLevel)

	lambda.Start(handler)
}
