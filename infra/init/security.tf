resource "aws_iam_role" "lambda_role" {
  name = "alexandria_lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      },
    ]
  })

  inline_policy {
    name = "alexandria_lambda_policy"

    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Action   = ["dynamodb:*"]
          Effect   = "Allow"
          Resource = ["${aws_dynamodb_table.alexandria_db.arn}", "${aws_dynamodb_table.alexandria_db.arn}/*"]
        }
      ]
    })
  }
}
