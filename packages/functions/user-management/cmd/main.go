// Edited by Claude.
package main

import (
	"context"
	"encoding/json"
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

// findUserByEmail searches for an existing user with the given email
// Returns username and whether it's a native user (username == email)
func findUserByEmail(userPoolId, email string) (*types.UserType, bool, error) {
	result, err := cognitoClient.ListUsers(context.TODO(), &cognitoidentityprovider.ListUsersInput{
		UserPoolId: aws.String(userPoolId),
		Filter:     aws.String(fmt.Sprintf("email = \"%s\"", email)),
	})
	if err != nil {
		return nil, false, err
	}

	if len(result.Users) == 0 {
		return nil, false, nil
	}

	user := &result.Users[0]
	// Native user has username == email
	isNative := *user.Username == email

	return user, isNative, nil
}

// Identity represents a federated identity from Cognito
type Identity struct {
	ProviderName string `json:"providerName"`
	ProviderType string `json:"providerType"`
	UserId       string `json:"userId"`
}

// providerNameMapping maps lowercase username prefixes to Cognito provider names.
//
// Why normalization is needed:
//   - Cognito generates federated usernames with lowercase prefixes (e.g., "google_123456789")
//   - But AdminLinkProviderForUser requires the provider name to EXACTLY match the
//     configured provider name in the User Pool (e.g., "Google" with capital G)
//   - AWS enforces PascalCase for built-in provider names (Google, Facebook, etc.)
//   - So we must normalize: "google" -> "Google" to match the Cognito configuration
var providerNameMapping = map[string]string{
	"google":          "Google",
	"facebook":        "Facebook",
	"signinwithapple": "SignInWithApple",
	"loginwithamazon": "LoginWithAmazon",
}

// normalizeProviderName converts lowercase username prefix to Cognito provider name
func normalizeProviderName(prefix string) string {
	if mapped, ok := providerNameMapping[strings.ToLower(prefix)]; ok {
		return mapped
	}
	// Return as-is if not in mapping (custom OIDC/SAML providers)
	return prefix
}

// extractProviderInfo extracts provider name and subject from identities attribute or username
func extractProviderInfo(identitiesJSON string, username string) (string, string) {
	// First try to parse from identities attribute (most reliable)
	if identitiesJSON != "" {
		var identities []Identity
		if err := json.Unmarshal([]byte(identitiesJSON), &identities); err == nil && len(identities) > 0 {
			log.Info().Msgf("Extracted provider from identities: name=%s, userId=%s",
				identities[0].ProviderName, identities[0].UserId)
			return identities[0].ProviderName, identities[0].UserId
		}
	}

	// Fallback: parse from username (e.g., "google_123456789")
	parts := strings.SplitN(username, "_", 2)
	if len(parts) == 2 {
		providerName := normalizeProviderName(parts[0])
		log.Info().Msgf("Extracted provider from username: raw=%s, normalized=%s, subject=%s",
			parts[0], providerName, parts[1])
		return providerName, parts[1]
	}

	return "", ""
}

// handlePreSignUp handles PreSignUp trigger for both native and federated users
// - Native: reject if any user with same email exists
// - Federated: link to existing user (native or federated) if found
//
// This ensures only ONE Cognito user per email, regardless of how many
// federated providers the user signs in with (Google, Facebook, etc.)
func handlePreSignUp(event events.CognitoEventUserPoolsPreSignup) (events.CognitoEventUserPoolsPreSignup, error) {
	isNativeSignup := event.TriggerSource == "PreSignUp_SignUp"
	isFederatedSignup := event.TriggerSource == "PreSignUp_ExternalProvider"

	log.Info().Msgf("PreSignUp - Trigger: %s, Username: %s", event.TriggerSource, event.UserName)

	// Get email for lookup
	var email string
	if isNativeSignup {
		// Validate email format for native signups
		_, err := mail.ParseAddress(event.UserName)
		if err != nil {
			log.Error().Msgf("Invalid username (not an email format): %s", event.UserName)
			return event, fmt.Errorf("invalid username (not an email format)")
		}
		email = event.UserName
	} else if isFederatedSignup {
		email = event.Request.UserAttributes["email"]
		if email == "" {
			log.Error().Msg("Federated user has no email attribute")
			return event, fmt.Errorf("email is required")
		}
	}

	// Check for existing user with same email
	existingUser, isExistingNative, err := findUserByEmail(event.UserPoolID, email)
	if err != nil {
		log.Error().Msgf("Error searching for existing user: %s", err.Error())
		return event, err
	}

	if isNativeSignup {
		// Native signup: reject if ANY user with same email exists
		if existingUser != nil {
			log.Error().Msgf("Native signup rejected - user already exists with email: %s", email)
			return event, fmt.Errorf("user already exists")
		}

		// Auto-confirm native users (skip email verification)
		event.Response.AutoConfirmUser = true
		log.Info().Msgf("Auto-confirming native user: %s", email)

	} else if isFederatedSignup {
		// Federated signup: link to existing user (native or federated) if found
		// This ensures one Cognito user per email across all providers
		if existingUser != nil {
			log.Info().Msgf("Linking federated user to existing user: %s (native=%t)", *existingUser.Username, isExistingNative)

			// Extract provider info from identities attribute or username
			identitiesJSON := event.Request.UserAttributes["identities"]
			log.Info().Msgf("Federated user - Username: %s, Identities: %s", event.UserName, identitiesJSON)

			providerName, providerSubject := extractProviderInfo(identitiesJSON, event.UserName)
			if providerName == "" || providerSubject == "" {
				log.Error().Msgf("Could not extract provider info from username: %s, identities: %s", event.UserName, identitiesJSON)
				return event, fmt.Errorf("invalid federated username format")
			}

			log.Info().Msgf("Linking with provider=%s, subject=%s", providerName, providerSubject)

			// Link the federated identity to the existing user
			linkInput := &cognitoidentityprovider.AdminLinkProviderForUserInput{
				UserPoolId: aws.String(event.UserPoolID),
				DestinationUser: &types.ProviderUserIdentifierType{
					ProviderName:           aws.String("Cognito"),
					ProviderAttributeValue: existingUser.Username,
				},
				SourceUser: &types.ProviderUserIdentifierType{
					ProviderName:           aws.String(providerName),
					ProviderAttributeName:  aws.String("Cognito_Subject"),
					ProviderAttributeValue: aws.String(providerSubject),
				},
			}
			log.Info().Msgf("AdminLinkProviderForUser input: UserPoolId=%s, DestUser=%s, SrcProvider=%s, SrcSubject=%s",
				event.UserPoolID, *existingUser.Username, providerName, providerSubject)

			_, err := cognitoClient.AdminLinkProviderForUser(context.TODO(), linkInput)
			if err != nil {
				log.Error().Msgf("Failed to link federated user: %s", err.Error())
				return event, err
			}

			log.Info().Msgf("Successfully linked %s to existing user %s", event.UserName, *existingUser.Username)

			// Return error to prevent creating a duplicate user
			// The user is now linked and can sign in via federated provider
			return event, fmt.Errorf("linked to existing account")
		}

		// No existing user with this email - this is a new federated user
		log.Info().Msgf("New federated user signup: %s", email)
	}

	// Send notification for new users (not linked)
	sendSignupNotification(email)

	return event, nil
}

// sendSignupNotification sends SNS notification for new user signup
func sendSignupNotification(email string) {
	message := Message{
		Source:            "alexandria-onboard-users",
		SourceDescription: "Alexandria user sign up (pre)",
		Target:            "slack",
		Content:           fmt.Sprintf("Awaiting registration for %s", email),
	}

	b, _ := json.Marshal(&message)
	params := sns.PublishInput{
		TargetArn: aws.String(os.Getenv("SNS_TOPIC_ARN")),
		Message:   aws.String(string(b)),
	}
	_, err := snsClient.Publish(context.TODO(), &params)
	if err != nil {
		log.Error().Msgf("Failed to publish to SNS topic: %s", err.Error())
	}
}

// handlePostConfirmation sets custom attributes for newly confirmed users
// With native linking, this only runs for truly new users (not linked)
func handlePostConfirmation(event events.CognitoEventUserPoolsPostConfirmation) (events.CognitoEventUserPoolsPostConfirmation, error) {
	log.Info().Msgf("PostConfirmation - Trigger: %s, Username: %s", event.TriggerSource, event.UserName)

	// Generate new custom:Id for this user
	userId := identifier.NewId()

	// Check if email is already set (federated users get email from provider)
	email := event.Request.UserAttributes["email"]
	hasEmail := email != ""

	// Build attributes to update
	var attributes []types.AttributeType

	// Only set email if not already present (native users need it set from username)
	if !hasEmail {
		attributes = append(attributes, types.AttributeType{
			Name:  aws.String("email"),
			Value: aws.String(event.UserName),
		})
	}

	// Set custom attributes
	attributes = append(attributes,
		types.AttributeType{
			Name:  aws.String("custom:Id"),
			Value: aws.String(userId),
		},
		types.AttributeType{
			Name:  aws.String("custom:Approved"),
			Value: aws.String("false"),
		},
	)

	log.Info().Msgf("Setting attributes for user %s: custom:Id=%s, custom:Approved=false", event.UserName, userId)

	_, err := cognitoClient.AdminUpdateUserAttributes(context.TODO(), &cognitoidentityprovider.AdminUpdateUserAttributesInput{
		UserPoolId:     aws.String(event.UserPoolID),
		Username:       aws.String(event.UserName),
		UserAttributes: attributes,
	})
	if err != nil {
		log.Error().Msgf("Failed to set attributes for user %s: %s", event.UserName, err.Error())
		return event, err
	}

	log.Info().Msgf("Successfully set attributes for user %s", event.UserName)
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
