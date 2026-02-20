// Edited by Claude.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/mail"
	"os"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
	"github.com/aws/aws-sdk-go-v2/service/sns"
	"github.com/rs/zerolog/log"
)

var snsClient *sns.Client
var cognitoClient *cognitoidentityprovider.Client

func init() {
	cfg, _ := config.LoadDefaultConfig(context.TODO(), config.WithRegion(os.Getenv("REGION")))
	snsClient = sns.NewFromConfig(cfg)
	cognitoClient = cognitoidentityprovider.NewFromConfig(cfg)
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

	// Check if user already exists in the user pool
	// PreSignUp fires before Cognito checks for duplicates, so we check manually
	// User Pool ID is available in the event itself
	_, err = cognitoClient.AdminGetUser(context.TODO(), &cognitoidentityprovider.AdminGetUserInput{
		UserPoolId: aws.String(event.UserPoolID),
		Username:   aws.String(event.UserName),
	})
	if err == nil {
		// User exists - let Cognito handle the duplicate error, don't send notification
		log.Info().Msgf("User already exists: %s, skipping notification", event.UserName)
		return event, nil
	}

	// Check if error is "user not found" (expected for new users)
	var userNotFoundErr *types.UserNotFoundException
	if !errors.As(err, &userNotFoundErr) {
		// Fallback: check error message for SDK v2 compatibility
		if strings.Contains(err.Error(), "UserNotFoundException") {
			log.Info().Msgf("User not found (string match), proceeding with notification")
		} else {
			// Unexpected error checking user existence
			log.Error().Msgf("Error checking user existence: %s", err.Error())
			return event, err
		}
	} else {
		log.Info().Msgf("User not found, proceeding with notification")
	}

	// User does not exist - send notification for new signup
	message := Message{
		Source:            "alexandria-onboard-users",
		SourceDescription: "Alexandria user sign up (pre)",
		Target:            "slack",
		Content:           fmt.Sprintf("Awaiting registration for %s", event.UserName),
	}

	b, _ := json.Marshal(&message)
	params := sns.PublishInput{
		TargetArn: aws.String(os.Getenv("SNS_TOPIC_ARN")),
		Message:   aws.String(string(b)),
	}
	_, err = snsClient.Publish(context.TODO(), &params)
	if err != nil {
		log.Error().Msgf("Failed to publish to SNS topic: %s", err.Error())
	}

	return event, err
}

func main() {
	lambda.Start(handler)
}
