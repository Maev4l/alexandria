
locals {
  apiFilename            = "../functions/api/dist/api.zip"
  indexerFilename        = "../functions/index-items/dist/indexer.zip"
  consistencyMgrFilename = "../functions/consistency-manager/dist/consistency-mgr.zip"
  userManagementFilename = "../functions/user-management/dist/user-management.zip"

  globalIndexFilename     = "global-index.tar.gz"
  sharedLibrariesFilename = "shared-libraries.json"

  # AWS Lambda Web Adapter (arm64) - publisher account 753240598075.
  # Bump intentionally; release notes:
  # https://github.com/aws/aws-lambda-web-adapter/releases
  lwa_layer_version = 27
  lwa_layer_arn     = "arn:aws:lambda:${var.region}:753240598075:layer:LambdaAdapterLayerArm64:${local.lwa_layer_version}"
}

module "api" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-function?ref=v1.7.1"

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
  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-apigw?ref=v1.7.1"

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
  source = "github.com/Maev4l/terraform-modules//modules/lambda-function?ref=v1.7.1"

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
  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-dynamodb?ref=v1.7.1"

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
  source = "github.com/Maev4l/terraform-modules//modules/lambda-function?ref=v1.7.1"

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
  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-dynamodb?ref=v1.7.1"

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

module "user_management" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-function?ref=v1.7.1"

  function_name = "alexandria-user-management"
  architecture  = "arm64"
  memory_size   = 128

  additional_policy_arns = [aws_iam_policy.user_management.arn]

  zip = {
    filename = local.userManagementFilename
    runtime  = "provided.al2023"
    handler  = "bootstrap"
    hash     = filebase64sha256("../functions/user-management/bin/bootstrap")
  }

  environment_variables = {
    REGION        = var.region
    SNS_TOPIC_ARN = data.aws_sns_topic.alerting.arn
  }
}

module "user_management_trigger" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-cognito?ref=v1.7.1"

  function_name = module.user_management.function_name
  function_arn  = module.user_management.function_arn

  user_pool_id = aws_cognito_user_pool.alexandria_user_pool.id
}


module "image_processor" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-function?ref=v1.7.1"

  function_name = "alexandria-image-processor"
  architecture  = "arm64"
  memory_size   = 512

  additional_policy_arns = [aws_iam_policy.images_processor.arn]

  image = {
    uri = "${aws_ecr_repository.images_processing.repository_url}:latest"
  }

  environment_variables = {
    REGION             = var.region
    S3_PICTURES_BUCKET = aws_s3_bucket.alexandria.id
  }
}

module "image_processor_trigger" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-s3?ref=v1.7.1"

  function_name = module.image_processor.function_name
  function_arn  = module.image_processor.function_arn

  bucket_id  = aws_s3_bucket.alexandria.id
  bucket_arn = aws_s3_bucket.alexandria.arn

  events = ["s3:ObjectCreated:*"]

  filters = [
    { prefix = "incoming/" }
  ]
}
