// Edited by Claude.
package cognito

import (
	"context"
	"errors"
	"fmt"
	"os"

	"alexandria.isnan.eu/functions/internal/slices"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
	"github.com/rs/zerolog/log"
)

var userPoolId string = os.Getenv("USER_POOL_ID")

type idp struct {
	client *cognitoidentityprovider.Client
}

func NewIdp(region string) *idp {
	config, _ := config.LoadDefaultConfig(context.TODO(), config.WithRegion(region))
	client := cognitoidentityprovider.NewFromConfig(config)
	return &idp{
		client: client,
	}
}

// GetUserIdFromUserName retrieves the custom:Id attribute for a user by their email
func (i *idp) GetUserIdFromUserName(userName string) (string, error) {
	// Filter by email attribute since username is now the email
	out, err := i.client.ListUsers(context.TODO(), &cognitoidentityprovider.ListUsersInput{
		UserPoolId: aws.String(userPoolId),
		Filter:     aws.String(fmt.Sprintf("email = '%s'", userName)),
	})

	if err != nil {
		log.Error().Msgf("Failed to retrieve user from email %s: %s", userName, err.Error())
		return "", err
	}

	if len(out.Users) == 0 {
		msg := fmt.Sprintf("No user with email: %s", userName)
		log.Warn().Msg(msg)
		return "", errors.New(msg)
	}

	u := out.Users[0]
	// Look for custom:Id attribute instead of sub
	attrs := slices.Filter(u.Attributes, func(a types.AttributeType) bool {
		return *a.Name == "custom:Id"
	})
	if len(attrs) == 0 {
		log.Warn().Msgf("User with email %s has no \"custom:Id\" attribute", userName)
		return "", errors.New("user has no custom:Id attribute")
	}

	value := attrs[0].Value
	if value == nil || len(*value) == 0 {
		log.Warn().Msgf("User with email %s has no \"custom:Id\" value", userName)
		return "", errors.New("user has no custom:Id value")
	}

	// custom:Id is already normalized (UUID without dashes, uppercase)
	return *value, nil
}
