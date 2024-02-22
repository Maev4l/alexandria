package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/mail"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/rs/zerolog/log"

	"github.com/aws/aws-sdk-go-v2/service/sns"
)

var client *sns.Client

func init() {

	config, _ := config.LoadDefaultConfig(context.TODO(), config.WithRegion(os.Getenv("REGION")))
	client = sns.NewFromConfig(config)
}

type Message struct {
	Source            string `json:"source"`
	SourceDescription string `json:"sourceDescription"`
	Target            string `json:"target"`
	Content           string `json:"content"`
}

func handler(event events.CognitoEventUserPoolsPreSignup) (events.CognitoEventUserPoolsPreSignup, error) {
	_, err := mail.ParseAddress(event.UserName)
	if err != nil {
		log.Error().Msgf("Invalid username (not an email format): %s", event.UserName)
		return event, fmt.Errorf("invalid username (not an email format)")
	}

	message := Message{
		Source:            "alexandria-pre-signup",
		SourceDescription: "Alexandria user sign up (pre)",
		Target:            "slack",
		Content:           fmt.Sprintf("Awaiting registration for %s", event.UserName),
	}

	b, _ := json.Marshal(&message)
	params := sns.PublishInput{
		TargetArn: aws.String(os.Getenv("SNS_TOPIC_ARN")),
		Message:   aws.String(string(b)),
	}
	_, err = client.Publish(context.TODO(), &params)
	if err != nil {
		log.Error().Msgf("Failed to publish to SNS topic: %s", err.Error())
	}

	return event, err
}

func main() {
	lambda.Start(handler)
}
