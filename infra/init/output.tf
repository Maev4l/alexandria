output "lambdaRoleArn" {
  value = aws_iam_role.lambda_role.arn
}

output "dynamodbTableArn" {
  value = aws_dynamodb_table.alexandria_db.arn
}
