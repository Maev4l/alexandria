
locals {
  apiFilename            = "../functions/api/dist/api.zip"
  indexerFilename        = "../functions/index-items/dist/indexer.zip"
  consistencyMgrFilename = "../functions/consistency-manager/dist/consistency-mgr.zip"
  userOnboardingFilename = "../functions/user-onboarding/dist/user-onboarding.zip"
  userApprovalFilename   = "../functions/user-approval/dist/user-approval.zip"

  globalIndexFilename     = "global-index.tar.gz"
  sharedLibrariesFilename = "shared-libraries.json"

  # AWS Lambda Web Adapter (arm64) - publisher account 753240598075.
  # Bump intentionally; release notes:
  # https://github.com/aws/aws-lambda-web-adapter/releases
  lwa_layer_version = 27
  lwa_layer_arn     = "arn:aws:lambda:${var.region}:753240598075:layer:LambdaAdapterLayerArm64:${local.lwa_layer_version}"
}

module "api" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-function?ref=v1.8.1"

  function_name = "alexandria-api"
  architecture  = "arm64"
  memory_size   = 128
  timeout       = 35

  additional_policy_arns = [aws_iam_policy.api.arn]

  # AWS Lambda Web Adapter (arm64). The layer's Extension intercepts the
  # Lambda runtime API and forwards events as HTTP requests to PORT.
  layers = [local.lwa_layer_arn]

  zip = {
    filename = local.apiFilename
    runtime  = "provided.al2023"
    handler  = "bootstrap"
    hash     = filebase64sha256("../functions/api/bin/bootstrap")
  }

  environment_variables = {
    DYNAMODB_TABLE_NAME       = aws_dynamodb_table.alexandria.name
    S3_PICTURES_BUCKET        = aws_s3_bucket.alexandria.id
    S3_INDEX_BUCKET           = aws_s3_bucket.alexandria.id
    REGION                    = var.region
    USER_POOL_ID              = aws_cognito_user_pool.alexandria_user_pool.id
    GLOBAL_INDEX_FILE_NAME    = local.globalIndexFilename
    SHARE_LIBRARIES_FILE_NAME = local.sharedLibrariesFilename
    LEK_SECRET_KEY            = "alexandria.lastevaluatedkey.secret"
    TMDB_ACCESS_TOKEN         = "alexandria.tmdb.access.token"
    SCRAPER_PROXY_API_KEY     = "alexandria.scraper.proxy.api.key"
    OCR_MODEL                 = var.ocr_model

    # AWS Lambda Web Adapter forwards events to this port on 127.0.0.1.
    # Must match the port the Gin server binds to in api/cmd/main.go.
    PORT                = "8080"
    AWS_LWA_INVOKE_MODE = "buffered"
  }
}

module "api_trigger" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-apigw?ref=v1.8.1"

  # The module appends "-http-api" to api_name when naming the HTTP API
  # resource. v1.6.0 derived "alexandria-api-http-api" from function_name;
  # passing "alexandria-api" here preserves that exact name in place.
  api_name = "alexandria-api"

  cors                         = false
  disable_execute_api_endpoint = false

  # JWT Authorizer integrated with Cognito User Pool
  authorizer = {
    name     = "alexandria-cognito-authorizer"
    issuer   = "https://cognito-idp.${var.region}.amazonaws.com/${aws_cognito_user_pool.alexandria_user_pool.id}"
    audience = [aws_cognito_user_pool_client.alexandria_client.id]
  }

  integrations = {
    api = {
      function_name = module.api.function_name
      function_arn  = module.api.function_arn
      invoke_arn    = module.api.invoke_arn
      routes = [
        "GET /api/v1/libraries",
        "POST /api/v1/libraries",
        "ANY /api/v1/libraries/{proxy+}",
        "POST /api/v1/detections",
        "POST /api/v1/search",
      ]
    }
  }
}

module "indexer" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-function?ref=v1.8.1"

  function_name                  = "alexandria-indexer"
  architecture                   = "arm64"
  memory_size                    = 256
  reserved_concurrent_executions = 1

  additional_policy_arns = [aws_iam_policy.index_items.arn]

  zip = {
    filename = local.indexerFilename
    runtime  = "provided.al2023"
    handler  = "bootstrap"
    hash     = filebase64sha256("../functions/index-items/bin/bootstrap")
  }

  environment_variables = {
    S3_INDEX_BUCKET           = aws_s3_bucket.alexandria.id
    REGION                    = var.region
    GLOBAL_INDEX_FILE_NAME    = local.globalIndexFilename
    SHARE_LIBRARIES_FILE_NAME = local.sharedLibrariesFilename
    DYNAMODB_TABLE_NAME       = aws_dynamodb_table.alexandria.name
  }
}

module "indexer_trigger" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-dynamodb?ref=v1.8.1"

  function_name = module.indexer.function_name
  function_arn  = module.indexer.function_arn

  role_name  = module.indexer.role_name
  stream_arn = aws_dynamodb_table.alexandria.stream_arn

  starting_position                  = "LATEST"
  maximum_batching_window_in_seconds = 10

  filter_criteria = [
    # INSERT: LIBRARY, BOOK, VIDEO, SHARED_LIBRARY
    {
      pattern = jsonencode({
        eventName = ["INSERT"]
        dynamodb = {
          NewImage = {
            EntityType = { S = ["LIBRARY", "BOOK", "VIDEO", "SHARED_LIBRARY"] }
          }
        }
      })
    },
    # MODIFY: BOOK, VIDEO only
    {
      pattern = jsonencode({
        eventName = ["MODIFY"]
        dynamodb = {
          NewImage = {
            EntityType = { S = ["BOOK", "VIDEO"] }
          }
        }
      })
    },
    # REMOVE: LIBRARY, BOOK, VIDEO, SHARED_LIBRARY
    {
      pattern = jsonencode({
        eventName = ["REMOVE"]
        dynamodb = {
          OldImage = {
            EntityType = { S = ["LIBRARY", "BOOK", "VIDEO", "SHARED_LIBRARY"] }
          }
        }
      })
    }
  ]
}

module "consistency_manager" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-function?ref=v1.8.1"

  function_name = "alexandria-consistency-manager"
  architecture  = "arm64"
  memory_size   = 256

  additional_policy_arns = [aws_iam_policy.consistency_manager.arn]

  zip = {
    filename = local.consistencyMgrFilename
    runtime  = "provided.al2023"
    handler  = "bootstrap"
    hash     = filebase64sha256("../functions/consistency-manager/bin/bootstrap")
  }

  environment_variables = {
    REGION              = var.region
    DYNAMODB_TABLE_NAME = aws_dynamodb_table.alexandria.name
  }
}

module "consistency_manager_trigger" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-dynamodb?ref=v1.8.1"

  function_name = module.consistency_manager.function_name
  function_arn  = module.consistency_manager.function_arn

  role_name  = module.consistency_manager.role_name
  stream_arn = aws_dynamodb_table.alexandria.stream_arn

  starting_position                  = "LATEST"
  maximum_batching_window_in_seconds = 10

  # Filter: MODIFY events for LIBRARY and COLLECTION entities, REMOVE for COLLECTION
  filter_criteria = [
    {
      pattern = jsonencode({
        eventName = ["MODIFY"]
        dynamodb = {
          NewImage = {
            EntityType = { S = ["LIBRARY", "COLLECTION"] }
          }
        }
      })
    },
    {
      pattern = jsonencode({
        eventName = ["REMOVE"]
        dynamodb = {
          OldImage = {
            EntityType = { S = ["COLLECTION"] }
          }
        }
      })
    }
  ]
}

module "user_onboarding" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-function?ref=v1.8.1"

  function_name = "alexandria-user-onboarding"
  architecture  = "arm64"
  memory_size   = 128

  additional_policy_arns = [aws_iam_policy.user_onboarding.arn]

  zip = {
    filename = local.userOnboardingFilename
    runtime  = "provided.al2023"
    handler  = "bootstrap"
    hash     = filebase64sha256("../functions/user-onboarding/bin/bootstrap")
  }

  environment_variables = {
    REGION        = var.region
    SNS_TOPIC_ARN = data.aws_sns_topic.alerting.arn
  }
}

module "user_onboarding_trigger" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-cognito?ref=v1.8.1"

  function_name = module.user_onboarding.function_name
  function_arn  = module.user_onboarding.function_arn

  user_pool_id = aws_cognito_user_pool.alexandria_user_pool.id
}

module "user_approval" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-function?ref=v1.8.1"

  function_name = "alexandria-user-approval"
  architecture  = "arm64"
  memory_size   = 128

  additional_policy_arns = [aws_iam_policy.user_approval.arn]

  zip = {
    filename = local.userApprovalFilename
    runtime  = "provided.al2023"
    handler  = "bootstrap"
    hash     = filebase64sha256("../functions/user-approval/bin/bootstrap")
  }

  environment_variables = {
    REGION        = var.region
    USER_POOL_ID  = aws_cognito_user_pool.alexandria_user_pool.id
    SNS_TOPIC_ARN = data.aws_sns_topic.alerting.arn
  }
}

# Subscribes user-approval to the alerter's alerting-responses topic. The filter
# policy matches the "source" message attribute the responder sets, so this
# lambda only sees decisions originating from Alexandria signup alerts.
module "user_approval_trigger" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-sns?ref=v1.8.1"

  function_name = module.user_approval.function_name
  function_arn  = module.user_approval.function_arn
  topic_arn     = data.aws_sns_topic.alerting_responses.arn
  filter_policy = jsonencode({ source = ["alexandria-onboard-users"] })
}


# Resolves `latest` to the digest it currently points at, on every plan.
#
# The Lambda below used to reference the tag directly, and a tag cannot express "the image I just
# pushed". Lambda resolves a tag to a digest once, at update time, and then caches it — so pushing
# a new image to the same tag leaves the configured `image_uri` string unchanged, Terraform sees no
# diff, apply reports no changes, and the function goes on running whatever digest it resolved
# months ago. Every step of the deploy succeeds and nothing rolls out.
#
# That is the worst shape of failure this repo keeps finding: no error anywhere, and the only way
# to notice is to check the function's LastModified or observe that its behaviour never changed.
# It was found while shipping the lossy-thumbnail encode in this commit — not because it fired,
# but because the function turned out to be five months stale for a different reason (a deploy
# that pushes without building), and this would have been the next thing to swallow the deploy.
#
# With the digest interpolated instead, a new push changes the plan and the function updates.
#
# The cost, accepted: this data source requires the tag to already exist, so a from-scratch
# bootstrap needs an image in ECR before the first apply. The repository is created here and the
# push is a separate step in `make backend-deploy`, so that ordering already held in practice.
data "aws_ecr_image" "images_processing" {
  repository_name = aws_ecr_repository.images_processing.name
  image_tag       = "latest"
}

module "image_processor" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-function?ref=v1.8.1"

  function_name = "alexandria-image-processor"
  architecture  = "arm64"
  memory_size   = 512

  additional_policy_arns = [aws_iam_policy.images_processor.arn]

  image = {
    uri = "${aws_ecr_repository.images_processing.repository_url}@${data.aws_ecr_image.images_processing.image_digest}"
  }

  environment_variables = {
    REGION             = var.region
    S3_PICTURES_BUCKET = aws_s3_bucket.alexandria.id
  }
}

module "image_processor_trigger" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-s3?ref=v1.8.1"

  function_name = module.image_processor.function_name
  function_arn  = module.image_processor.function_arn

  bucket_id  = aws_s3_bucket.alexandria.id
  bucket_arn = aws_s3_bucket.alexandria.arn

  events = ["s3:ObjectCreated:*"]

  filters = [
    { prefix = "incoming/" }
  ]
}
