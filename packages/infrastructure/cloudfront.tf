# CloudFront distribution for alexandria.isnan.eu
# Routes: /* → S3 (frontend), /api/* → API Gateway

# Managed cache policies
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

# Use managed policy that forwards all viewer headers except Host (for API Gateway)
data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

# Origin Access Control for S3 (webclient)
resource "aws_cloudfront_origin_access_control" "webclient" {
  name                              = "alexandria-webclient-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Origin Access Control for S3 (thumbnails)
resource "aws_cloudfront_origin_access_control" "thumbnails" {
  name                              = "alexandria-thumbnails-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Function to strip /thumbnails prefix
resource "aws_cloudfront_function" "strip_thumbnails_prefix" {
  name    = "alexandria-strip-thumbnails-prefix"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = <<-EOF
    function handler(event) {
      var request = event.request;
      // Strip /thumbnails prefix: /thumbnails/user/... → /user/...
      if (request.uri.startsWith('/thumbnails/')) {
        request.uri = request.uri.substring(11);
      }
      return request;
    }
  EOF
}

# Cache policy for thumbnails (7 days TTL, forward query strings for cache busting)
resource "aws_cloudfront_cache_policy" "thumbnails" {
  name        = "alexandria-thumbnails-cache-policy"
  min_ttl     = 0
  default_ttl = 604800 # 7 days
  max_ttl     = 604800 # 7 days

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "all" # Forward query strings for cache busting (?v=timestamp)
    }
  }
}

# Response headers policy for thumbnails - tells browser to cache for 7 days
resource "aws_cloudfront_response_headers_policy" "thumbnails" {
  name = "alexandria-thumbnails-response-headers"

  custom_headers_config {
    items {
      header   = "Cache-Control"
      value    = "public, max-age=604800, immutable"
      override = true
    }
  }
}

# App shell (index.html, sw.js, manifest, workbox-*) must always revalidate. These have
# STABLE filenames, so without no-cache the browser/CDN can serve a stale shell and the PWA
# keeps re-prompting a stuck "waiting" service worker. no-cache forces revalidation so a new
# deploy rolls out cleanly.
resource "aws_cloudfront_response_headers_policy" "webclient_no_cache" {
  name = "alexandria-webclient-no-cache"

  custom_headers_config {
    items {
      header   = "Cache-Control"
      value    = "no-cache"
      override = true
    }
  }
}

# Vite content-hashed build assets (/assets/*) never change in place - the filename changes
# when the content changes - so they are safe to cache forever.
resource "aws_cloudfront_response_headers_policy" "webclient_immutable" {
  name = "alexandria-webclient-immutable"

  custom_headers_config {
    items {
      header   = "Cache-Control"
      value    = "public, max-age=31536000, immutable"
      override = true
    }
  }
}

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  default_root_object = "index.html"
  aliases             = ["alexandria.isnan.eu"]
  price_class         = "PriceClass_100"

  # S3 Origin (frontend)
  origin {
    domain_name              = aws_s3_bucket.webclient.bucket_regional_domain_name
    origin_id                = "s3-webclient"
    origin_access_control_id = aws_cloudfront_origin_access_control.webclient.id
  }

  # API Gateway Origin
  origin {
    domain_name = replace(module.api_trigger.api_endpoint, "https://", "")
    origin_id   = "api-gateway"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # S3 Origin (thumbnails)
  origin {
    domain_name              = aws_s3_bucket.alexandria.bucket_regional_domain_name
    origin_id                = "s3-thumbnails"
    origin_access_control_id = aws_cloudfront_origin_access_control.thumbnails.id
  }

  # Default → S3 (frontend). The app shell falls through here (index.html, sw.js, manifest,
  # workbox-*); no-cache makes the browser revalidate so PWA updates roll out cleanly.
  default_cache_behavior {
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = "s3-webclient"
    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.webclient_no_cache.id
  }

  # /thumbnails/* → S3 (pictures bucket)
  ordered_cache_behavior {
    path_pattern               = "/thumbnails/*"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = "s3-thumbnails"
    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.thumbnails.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.thumbnails.id

    # CloudFront Function to strip /thumbnails prefix
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.strip_thumbnails_prefix.arn
    }
  }

  # /api/* → API Gateway
  ordered_cache_behavior {
    path_pattern             = "/api/*"
    allowed_methods          = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods           = ["GET", "HEAD"]
    target_origin_id         = "api-gateway"
    viewer_protocol_policy   = "redirect-to-https"
    compress                 = true
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
  }

  # /assets/* → S3 (frontend). Content-hashed bundles: immutable, long-lived cache.
  # Patterns don't overlap, so precedence order vs the behaviors above is irrelevant.
  ordered_cache_behavior {
    path_pattern               = "/assets/*"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = "s3-webclient"
    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.webclient_immutable.id
  }

  # SPA fallback: return index.html for 404 only
  # Note: Do NOT add 403 here - it would mask API Gateway auth errors
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = data.aws_acm_certificate.wildcard_isnan.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
