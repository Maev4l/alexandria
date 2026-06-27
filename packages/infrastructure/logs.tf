# CloudFront log delivery (v2) wiring; the destination bucket is defined in s3.tf.
# See docs/superpowers/specs/2026-06-27-cloudfront-access-log-historization-design.md

# Registers the CloudFront distribution as a log delivery source.
# MUST be created in us-east-1 (CloudFront delivery API requirement).
resource "aws_cloudwatch_log_delivery_source" "cloudfront" {
  provider     = aws.us_east_1
  name         = "alexandria-cloudfront-access-logs"
  log_type     = "ACCESS_LOGS"
  resource_arn = aws_cloudfront_distribution.main.arn
}

# Where logs go + their on-disk format. Parquet output (confirmed allowed for S3).
# The "/raw" suffix on the destination ARN makes logs land flat under raw/ AND
# suppresses CloudFront's default AWSLogs/aws-account-id=<id>/CloudFront/ path.
# MUST be created in us-east-1. output_format can only be set at creation.
resource "aws_cloudwatch_log_delivery_destination" "cloudfront_s3" {
  provider                  = aws.us_east_1
  name                      = "alexandria-cloudfront-s3"
  delivery_destination_type = "S3"
  output_format             = "parquet"

  delivery_destination_configuration {
    destination_resource_arn = "${aws_s3_bucket.cloudfront_logs.arn}/raw"
  }
}

# The pipe: links source → destination and selects fields. No s3_delivery_configuration
# block => flat delivery under the raw/ prefix (no Hive partitioning, no suffix_path).
# depends_on the bucket policy: CreateDelivery validates write access, so the policy
# must exist first or delivery creation fails.
resource "aws_cloudwatch_log_delivery" "cloudfront" {
  provider                 = aws.us_east_1
  delivery_source_name     = aws_cloudwatch_log_delivery_source.cloudfront.name
  delivery_destination_arn = aws_cloudwatch_log_delivery_destination.cloudfront_s3.arn

  # Field names verified against the live config-templates API. cs(Host)/cs(User-Agent)
  # are parenthesized; c-country + asn give per-row geo/network from the viewer IP.
  record_fields = [
    "date",
    "time",
    "c-ip",
    "c-country",
    "asn",
    "cs-method",
    "cs-protocol",
    "cs(Host)",
    "cs-uri-stem",
    "cs-uri-query",
    "sc-status",
    "x-edge-result-type",
    "x-edge-location",
    "cs(User-Agent)",
  ]

  depends_on = [aws_s3_bucket_policy.cloudfront_logs]
}
