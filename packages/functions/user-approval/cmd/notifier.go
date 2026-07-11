package main

import (
	"context"
	"encoding/json"

	"github.com/Maev4l/platform/notifications"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sns"
	"github.com/rs/zerolog/log"
)

type snsNotifier struct {
	client   *sns.Client
	topicArn string
}

func newNotifier(region, topicArn string) *snsNotifier {
	cfg, _ := config.LoadDefaultConfig(context.TODO(), config.WithRegion(region))
	return &snsNotifier{client: sns.NewFromConfig(cfg), topicArn: topicArn}
}

// Notify publishes a Slack-targeted Markdown alert on the shared alerting topic
// using the shared notifications.Message contract.
func (n *snsNotifier) Notify(sourceDescription, content string) error {
	if n.topicArn == "" {
		log.Warn().Msg("SNS_TOPIC_ARN not configured, skipping notification")
		return nil
	}
	body, err := json.Marshal(notifications.Message{
		Target:            "slack",
		Source:            "alexandria-user-approval",
		SourceDescription: sourceDescription,
		Content:           content,
		Format:            "markdown",
	})
	if err != nil {
		return err
	}
	_, err = n.client.Publish(context.TODO(), &sns.PublishInput{
		TargetArn: aws.String(n.topicArn),
		Message:   aws.String(string(body)),
	})
	return err
}
