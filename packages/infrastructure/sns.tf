# SNS topic data source for alerting

data "aws_sns_topic" "alerting" {
  name = "alerting-events"
}

# Responses topic: the alerter responder republishes Slack approve/reject
# decisions here. user-approval subscribes with a source filter policy.
data "aws_sns_topic" "alerting_responses" {
  name = "alerting-responses"
}
