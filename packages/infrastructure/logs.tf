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
# The "/raw/app" suffix on the destination ARN makes logs land flat under
# raw/app/ AND suppresses CloudFront's default
# AWSLogs/aws-account-id=<id>/CloudFront/ path. The app segment namespaces this
# distribution so other sources can be added later under sibling prefixes.
# MUST be created in us-east-1. output_format is creation-only; changing the destination
# ARN requires deleting the referencing delivery first (AWS rejects in-place updates while
# a delivery references it), so Terraform must destroy the pipe, update, then recreate it.
resource "aws_cloudwatch_log_delivery_destination" "cloudfront_s3" {
  provider                  = aws.us_east_1
  name                      = "alexandria-cloudfront-s3"
  delivery_destination_type = "S3"
  output_format             = "parquet"

  delivery_destination_configuration {
    destination_resource_arn = "${aws_s3_bucket.cloudfront_logs.arn}/raw/app"
  }
}

# The pipe: links source → destination and selects fields.
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

  # Hive-style date partitioning UNDER the raw/app prefix => objects land at
  # raw/app/year=YYYY/month=MM/day=DD/. enable_hive_compatible_path MUST be true: only
  # then does AWS allow the key=value layout, and it auto-expands the bare {yyyy}/{MM}/{dd}
  # placeholders into year=/month=/day= (writing "year={yyyy}" literally is rejected with
  # "Provided suffixPath is invalid" while the flag is off). The hive flag's other effect
  # (formatting an auto-injected account-id) doesn't apply since we use an explicit prefix.
  s3_delivery_configuration {
    suffix_path                 = "{yyyy}/{MM}/{dd}"
    enable_hive_compatible_path = true
  }

  depends_on = [aws_s3_bucket_policy.cloudfront_logs]
}
