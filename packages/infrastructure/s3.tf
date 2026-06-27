resource "aws_s3_bucket" "alexandria" {
  bucket = "alexandria-items"
  # Allow `terraform destroy` to remove the bucket even when objects remain.
  force_destroy = true
}

resource "aws_s3_bucket_lifecycle_configuration" "alexandria" {
  bucket = aws_s3_bucket.alexandria.id

  rule {
    id     = "IncomingPicturesRule"
    status = "Enabled"

    filter {
      prefix = "incoming"
    }

    expiration {
      days = 1
    }
  }
}

resource "aws_s3_bucket_public_access_block" "alexandria" {
  bucket = aws_s3_bucket.alexandria.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "alexandria" {
  bucket = aws_s3_bucket.alexandria.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Bucket policy to allow CloudFront OAC access to thumbnails
resource "aws_s3_bucket_policy" "alexandria_cloudfront" {
  bucket = aws_s3_bucket.alexandria.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAC"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.alexandria.arn}/user/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
          }
        }
      }
    ]
  })
}

# Dedicated bucket for CloudFront access logs (one bucket per app, by design).
# Account-id suffix guarantees the globally-unique S3 name ("alexandria-cloudfront-logs"
# alone is already taken in the global namespace).
resource "aws_s3_bucket" "cloudfront_logs" {
  bucket = "alexandria-cloudfront-logs-${data.aws_caller_identity.current.account_id}"
  # Allow `terraform destroy` to remove the bucket even when log objects remain.
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "cloudfront_logs" {
  bucket                  = aws_s3_bucket.cloudfront_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cloudfront_logs" {
  bucket = aws_s3_bucket.cloudfront_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Whole-bucket 90-day expiry, no prefix filter. The bucket is dedicated to these logs
# (everything lands under raw/), so expiring all objects is correct and simplest.
resource "aws_s3_bucket_lifecycle_configuration" "cloudfront_logs" {
  bucket = aws_s3_bucket.cloudfront_logs.id

  rule {
    id     = "ExpireCloudFrontLogs"
    status = "Enabled"

    filter {} # all objects

    expiration {
      days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 3
    }
  }
}

# Allows the log-delivery service principal to write objects into the bucket.
# Mirrors AWS's documented "AWSLogsDeliveryWrite" statement. Resource is the WHOLE
# bucket to avoid the path-prefix mismatch AWS warns about. aws:SourceArn uses the
# account-wide delivery-source wildcard so this policy needs no specific source ref.
resource "aws_s3_bucket_policy" "cloudfront_logs" {
  bucket = aws_s3_bucket.cloudfront_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AWSLogsDeliveryWrite"
        Effect    = "Allow"
        Principal = { Service = "delivery.logs.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.cloudfront_logs.arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl"      = "bucket-owner-full-control"
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
          ArnLike = {
            "aws:SourceArn" = "arn:aws:logs:us-east-1:${data.aws_caller_identity.current.account_id}:delivery-source:*"
          }
        }
      }
    ]
  })
}
