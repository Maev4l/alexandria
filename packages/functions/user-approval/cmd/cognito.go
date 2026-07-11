package main

import (
	"context"
	"errors"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
)

type cognito struct {
	client     *cognitoidentityprovider.Client
	userPoolId string
}

func newCognito(region, userPoolId string) *cognito {
	cfg, _ := config.LoadDefaultConfig(context.TODO(), config.WithRegion(region))
	return &cognito{client: cognitoidentityprovider.NewFromConfig(cfg), userPoolId: userPoolId}
}

// ApproveUser flips custom:Approved to "true". Idempotent: a no-op on an
// already-approved user.
func (c *cognito) ApproveUser(username string) error {
	_, err := c.client.AdminUpdateUserAttributes(context.TODO(), &cognitoidentityprovider.AdminUpdateUserAttributesInput{
		UserPoolId: aws.String(c.userPoolId),
		Username:   aws.String(username),
		UserAttributes: []types.AttributeType{
			{Name: aws.String("custom:Approved"), Value: aws.String("true")},
		},
	})
	return err
}

// DeleteUser removes the pending Cognito user. A reject of an already-deleted
// user is treated as success — the desired end state (user gone) already holds,
// which keeps the action idempotent under Slack re-delivery.
func (c *cognito) DeleteUser(username string) error {
	_, err := c.client.AdminDeleteUser(context.TODO(), &cognitoidentityprovider.AdminDeleteUserInput{
		UserPoolId: aws.String(c.userPoolId),
		Username:   aws.String(username),
	})
	var notFound *types.UserNotFoundException
	if errors.As(err, &notFound) {
		return nil
	}
	return err
}

// IsApproved reports whether the user's custom:Approved attribute is "true".
// Used to avoid deleting a user who was already approved via another path.
func (c *cognito) IsApproved(username string) (bool, error) {
	out, err := c.client.AdminGetUser(context.TODO(), &cognitoidentityprovider.AdminGetUserInput{
		UserPoolId: aws.String(c.userPoolId),
		Username:   aws.String(username),
	})
	if err != nil {
		// An already-deleted user (duplicate reject / SNS redelivery) reports
		// "not approved" so the caller falls through to DeleteUser, which also
		// swallows not-found — keeping reject idempotent (matches DeleteUser).
		var notFound *types.UserNotFoundException
		if errors.As(err, &notFound) {
			return false, nil
		}
		return false, err
	}
	for _, attr := range out.UserAttributes {
		if attr.Name != nil && *attr.Name == "custom:Approved" {
			return attr.Value != nil && *attr.Value == "true", nil
		}
	}
	return false, nil
}
