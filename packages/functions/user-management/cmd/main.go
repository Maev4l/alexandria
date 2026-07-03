// Alexandria Cognito Lambda - uses common cognito library with custom notification.
package main

import (
	"context"
	"fmt"

	"github.com/Maev4l/platform/notifications"
	"github.com/Maev4l/platform/users-management/pkg/cognito"
	"github.com/aws/aws-lambda-go/lambda"
)

func main() {
	handler := cognito.NewHandler()

	// Configure Alexandria-specific notification
	handler.GetNotification = func(ctx context.Context, event *cognito.PreSignUpEvent, _ *cognito.AppConfig) (*cognito.NotificationPayload, bool) {
		// Construct notifications.Message directly (cognito.NotificationPayload is
		// an alias for it) so this module depends on notifications v1.1.0 explicitly
		// and `go mod tidy` keeps the Format field available.
		return &notifications.Message{
			Source:            "alexandria-onboard-users",
			// Empty: the Markdown header already carries the app name, so a context
			// line would just duplicate it.
			SourceDescription: "",
			Target:            "slack",
			// Markdown: header + bullets (mirrors the idp access-request layout).
			// The email is fenced as inline code (may contain _).
			Content: fmt.Sprintf("# 🔐 Access Request\n\n- **User:** `%s`\n- **App:** Alexandria", event.Email),
			Format:  "markdown",
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
