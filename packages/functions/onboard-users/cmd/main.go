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

	"alexandria.isnan.eu/functions/internal/identifier"
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

// handlePreSignUp validates email format and sends notification for new signups
// Only enforces email format for native signups (not federated)
func handlePreSignUp(event events.CognitoEventUserPoolsPreSignup) (events.CognitoEventUserPoolsPreSignup, error) {
	// Check if this is a native signup (not federated)
	// TriggerSource for native: "PreSignUp_SignUp"
	// TriggerSource for federated: "PreSignUp_ExternalProvider"
	isNativeSignup := event.TriggerSource == "PreSignUp_SignUp"

	// Only validate email format for native signups
	if isNativeSignup {
		_, err := mail.ParseAddress(event.UserName)
		if err != nil {
			log.Error().Msgf("Invalid username (not an email format): %s", event.UserName)
			return event, fmt.Errorf("invalid username (not an email format)")
		}
	}

	// Check if user already exists in the user pool
	// PreSignUp fires before Cognito checks for duplicates, so we check manually
	_, err := cognitoClient.AdminGetUser(context.TODO(), &cognitoidentityprovider.AdminGetUserInput{
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

// handlePostConfirmation sets custom attributes after user confirmation
// Generates UUID for custom:Id and sets custom:Approved to "false"
func handlePostConfirmation(event events.CognitoEventUserPoolsPostConfirmation) (events.CognitoEventUserPoolsPostConfirmation, error) {
	// Generate a new UUID for the user (without dashes, uppercase)
	userId := identifier.NewId()

	log.Info().Msgf("Setting custom attributes for user %s: custom:Id=%s, custom:Approved=false", event.UserName, userId)

	// Set custom attributes
	_, err := cognitoClient.AdminUpdateUserAttributes(context.TODO(), &cognitoidentityprovider.AdminUpdateUserAttributesInput{
		UserPoolId: aws.String(event.UserPoolID),
		Username:   aws.String(event.UserName),
		UserAttributes: []types.AttributeType{
			{
				Name:  aws.String("custom:Id"),
				Value: aws.String(userId),
			},
			{
				Name:  aws.String("custom:Approved"),
				Value: aws.String("false"),
			},
		},
	})

	if err != nil {
		log.Error().Msgf("Failed to set custom attributes for user %s: %s", event.UserName, err.Error())
		return event, err
	}

	log.Info().Msgf("Successfully set custom attributes for user %s", event.UserName)
	return event, nil
}

// handler routes to appropriate function based on trigger source
func handler(ctx context.Context, event map[string]interface{}) (interface{}, error) {
	triggerSource, ok := event["triggerSource"].(string)
	if !ok {
		log.Error().Msg("Missing triggerSource in event")
		return event, fmt.Errorf("missing triggerSource")
	}

	log.Info().Msgf("Processing trigger: %s", triggerSource)

	// Route based on trigger source
	switch {
	case strings.HasPrefix(triggerSource, "PreSignUp"):
		// Parse as PreSignUp event
		eventBytes, _ := json.Marshal(event)
		var preSignUpEvent events.CognitoEventUserPoolsPreSignup
		if err := json.Unmarshal(eventBytes, &preSignUpEvent); err != nil {
			log.Error().Msgf("Failed to parse PreSignUp event: %s", err.Error())
			return event, err
		}
		return handlePreSignUp(preSignUpEvent)

	case strings.HasPrefix(triggerSource, "PostConfirmation"):
		// Parse as PostConfirmation event
		eventBytes, _ := json.Marshal(event)
		var postConfirmEvent events.CognitoEventUserPoolsPostConfirmation
		if err := json.Unmarshal(eventBytes, &postConfirmEvent); err != nil {
			log.Error().Msgf("Failed to parse PostConfirmation event: %s", err.Error())
			return event, err
		}
		return handlePostConfirmation(postConfirmEvent)

	default:
		log.Warn().Msgf("Unhandled trigger source: %s", triggerSource)
		return event, nil
	}
}

func main() {
	lambda.Start(handler)
}
