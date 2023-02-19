terraform {
  backend "s3" {
    bucket         = "global-tf-states"
    region         = "eu-central-1"
    key            = "alexandria/terraform.tfstate"
    encrypt        = "true"
    dynamodb_table = "lock-terraform-state"
  }
}

provider "aws" {
  region = "eu-central-1"
  default_tags {
    tags = {
      "owner"       = "terraform"
      "application" = "alexandria"
    }
  }
}

provider "aws" {
  alias  = "us-east-1"
  region = "us-east-1"
}

data "aws_acm_certificate" "main_certificate" {
  provider = aws.us-east-1
  domain   = "*.isnan.eu"
  types    = ["IMPORTED"]
}

data "aws_region" "current" {}

data "aws_caller_identity" "current" {}
