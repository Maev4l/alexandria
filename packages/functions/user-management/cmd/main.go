// Alexandria Cognito Lambda - uses common cognito library with custom notification.
package main

import (
	"context"
	"fmt"

	"github.com/Maev4l/platform/users-management/pkg/cognito"
	"github.com/aws/aws-lambda-go/lambda"
)

func main() {
	handler := cognito.NewHandler()

	// Configure Alexandria-specific notification
	handler.GetNotification = func(ctx context.Context, event *cognito.PreSignUpEvent) (*cognito.NotificationPayload, bool) {
		return &cognito.NotificationPayload{
			Source:            "alexandria-onboard-users",
			SourceDescription: "Alexandria user sign up (pre)",
			Target:            "slack",
			Content:           fmt.Sprintf("Awaiting registration for %s", event.Email),
		}, true
	}

	handler.GetCustomAttributes = func(ctx context.Context, event *cognito.PostConfirmationEvent) ([]cognito.Attribute, error) {
		attrs := []cognito.Attribute{
			{Name: "custom:Approved", Value: "false"},
		}
		return attrs, nil
	}

	lambda.Start(handler.Handle)
}
