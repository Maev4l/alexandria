package cognito

import (
	"context"
	"errors"
	"fmt"
	"os"

	"alexandria.isnan.eu/functions/internal/identifier"
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

func (i *idp) GetUserIdFromUserName(userName string) (string, error) {
	out, err := i.client.ListUsers(context.TODO(), &cognitoidentityprovider.ListUsersInput{
		UserPoolId: aws.String(userPoolId),
		Filter:     aws.String(fmt.Sprintf("username = '%s'", userName)),
	})

	if err != nil {
		log.Error().Msgf("Failed to retrieved user from name %s: %s", userName, err.Error())
		return "", err
	}

	if len(out.Users) == 0 {
		msg := fmt.Sprintf("No user with name: %s", userName)
		log.Warn().Msg(msg)
		return "", errors.New(msg)
	}

	u := out.Users[0]
	attrs := slices.Filter(u.Attributes, func(a types.AttributeType) bool {
		return *a.Name == "sub"
	})
	if len(attrs) == 0 {
		log.Warn().Msgf("User with name %s has no \"sub\" attribute", userName)
		return "", nil
	}

	name := attrs[0].Value
	if name == nil || len(*name) == 0 {
		log.Warn().Msgf("User with name %s has no \"sub\" value", userName)
		return "", nil
	}

	return identifier.Normalize(*name), nil
}
