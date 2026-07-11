// Alexandria user-approval lambda — consumes Slack approve/reject decisions
// from the alerting-responses SNS topic and applies them to the Cognito user.
package main

import (
	"os"

	"github.com/aws/aws-lambda-go/lambda"
)

func main() {
	region := os.Getenv("REGION")
	userPoolId := os.Getenv("USER_POOL_ID")
	topicArn := os.Getenv("SNS_TOPIC_ARN")

	a := newCognito(region, userPoolId)
	n := newNotifier(region, topicArn)

	lambda.Start(makeHandler(a, n))
}
