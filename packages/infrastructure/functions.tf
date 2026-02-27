
locals {
  apiFilename            = "../functions/api/dist/api.zip"
  indexerFilename        = "../functions/index-items/dist/indexer.zip"
  consistencyMgrFilename = "../functions/consistency-manager/dist/consistency-mgr.zip"
  onboardUsersFilename   = "../functions/onboard-users/dist/onboard-users.zip"

  globalIndexFilename     = "global-index.tar.gz"
  sharedLibrariesFilename = "shared-libraries.json"
}

resource "aws_lambda_function" "api" {
  function_name = "alexandria-api"
  filename      = local.apiFilename
  role          = aws_iam_role.api.arn
  handler       = "bootstrap"
  runtime       = "provided.al2023"
  architectures = ["arm64"]
  code_sha256   = filebase64sha256(local.apiFilename)
  package_type  = "Zip"
  memory_size   = 128

  environment {
    variables = {
      DYNAMODB_TABLE_NAME : aws_dynamodb_table.alexandria.name
      S3_PICTURES_BUCKET : aws_s3_bucket.alexandria.id
      S3_INDEX_BUCKET : aws_s3_bucket.alexandria.id
      REGION : var.region
      USER_POOL_ID : aws_cognito_user_pool.alexandria_user_pool.id
      GLOBAL_INDEX_FILE_NAME : local.globalIndexFilename
      SHARE_LIBRARIES_FILE_NAME : local.sharedLibrariesFilename
      LEK_SECRET_KEY : "alexandria.lastevaluatedkey.secret"
      TMDB_ACCESS_TOKEN : "alexandria.tmdb.access.token"
    }
  }
}

module "api_trigger" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-apigw?ref=v1.3.0"

  function_name = aws_lambda_function.api.function_name
  function_arn  = aws_lambda_function.api.arn
  invoke_arn    = aws_lambda_function.api.invoke_arn
  cors          = false

  # Allow CloudFront to access the execute-api endpoint
  disable_execute_api_endpoint = false

  # JWT Authorizer integrated with Cognito User Pool
  authorizer = {
    name     = "alexandria-cognito-authorizer"
    issuer   = "https://cognito-idp.${var.region}.amazonaws.com/${aws_cognito_user_pool.alexandria_user_pool.id}"
    audience = [aws_cognito_user_pool_client.alexandria_client.id]
  }

  routes = [
    "GET /api/v1/libraries",
    "POST /api/v1/libraries",
    "ANY /api/v1/libraries/{proxy+}",
    "POST /api/v1/detections",
    "POST /api/v1/search"
  ]
}

resource "aws_lambda_function" "indexer" {
  function_name                  = "alexandria-indexer"
  filename                       = local.indexerFilename
  role                           = aws_iam_role.index_items.arn
  handler                        = "bootstrap"
  runtime                        = "provided.al2023"
  architectures                  = ["arm64"]
  code_sha256                    = filebase64sha256(local.indexerFilename)
  package_type                   = "Zip"
  memory_size                    = 256
  reserved_concurrent_executions = 1

  environment {
    variables = {
      S3_INDEX_BUCKET : aws_s3_bucket.alexandria.id
      REGION : var.region
      GLOBAL_INDEX_FILE_NAME : local.globalIndexFilename
      SHARE_LIBRARIES_FILE_NAME : local.sharedLibrariesFilename
      DYNAMODB_TABLE_NAME : aws_dynamodb_table.alexandria.name
    }
  }
}

module "indexer_trigger" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-dynamodb?ref=v1.3.0"

  function_name = aws_lambda_function.indexer.function_name
  function_arn  = aws_lambda_function.indexer.arn

  role_name  = aws_iam_role.index_items.name
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

resource "aws_lambda_function" "consistency_manager" {
  function_name = "alexandria-consistency-manager"
  filename      = local.consistencyMgrFilename
  role          = aws_iam_role.consistency_manager.arn
  handler       = "bootstrap"
  runtime       = "provided.al2023"
  architectures = ["arm64"]
  code_sha256   = filebase64sha256(local.consistencyMgrFilename)
  package_type  = "Zip"
  memory_size   = 256

  environment {
    variables = {
      REGION : var.region
      DYNAMODB_TABLE_NAME : aws_dynamodb_table.alexandria.name
    }
  }
}

module "consistency_manager_trigger" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-dynamodb?ref=v1.3.0"

  function_name = aws_lambda_function.consistency_manager.function_name
  function_arn  = aws_lambda_function.consistency_manager.arn

  role_name  = aws_iam_role.consistency_manager.name
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

resource "aws_lambda_function" "onboard_users" {
  function_name = "alexandria-onboard-users"
  filename      = local.onboardUsersFilename
  role          = aws_iam_role.onboard_users.arn
  handler       = "bootstrap"
  runtime       = "provided.al2023"
  architectures = ["arm64"]
  code_sha256   = filebase64sha256(local.onboardUsersFilename)
  package_type  = "Zip"
  memory_size   = 128

  environment {
    variables = {
      REGION : var.region
      SNS_TOPIC_ARN : data.aws_sns_topic.alerting.arn
    }
  }
}

module "onboard_users_trigger" {
  source = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-cognito?ref=v1.3.0"

  function_name = aws_lambda_function.onboard_users.function_name
  function_arn  = aws_lambda_function.onboard_users.arn

  user_pool_id = aws_cognito_user_pool.alexandria_user_pool.id
}


resource "aws_lambda_function" "image_processor" {
  function_name = "alexandria-image-processor"
  image_uri     = "${aws_ecr_repository.images_processing.repository_url}:latest"
  role          = aws_iam_role.images_processor.arn
  architectures = ["arm64"]

  package_type = "Image"
  memory_size  = 512

  environment {
    variables = {
      REGION : var.region
      S3_PICTURES_BUCKET : aws_s3_bucket.alexandria.id
    }
  }
}

module "image_processor_trigger" {
  source        = "github.com/Maev4l/terraform-modules//modules/lambda-trigger-s3?ref=v1.3.0"
  function_name = aws_lambda_function.image_processor.function_name
  function_arn  = aws_lambda_function.image_processor.arn

  bucket_id  = aws_s3_bucket.alexandria.id
  bucket_arn = aws_s3_bucket.alexandria.arn

  events = ["s3:ObjectCreated:*"]

  filters = [
    { prefix = "incoming/" }
  ]
}
