resource "aws_dynamodb_table" "alexandria_db" {
  billing_mode = "PAY_PER_REQUEST"
  name         = "alexandria"

  server_side_encryption {
    enabled = true
  }

  hash_key  = "PK"
  range_key = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

}
