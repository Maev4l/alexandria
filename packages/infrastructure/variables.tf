# Common variables for Alexandria infrastructure

variable "region" {
  description = "AWS region"
  type        = string
  default     = "eu-central-1"
}

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  type        = string
  default     = "alexandria"
}

variable "authentication_domain" {
  description = "Domain for federated authentication"
  type        = string
  default     = "alexandria-auth.isnan.eu"
}

variable "ocr_model" {
  description = "Bedrock model ID for OCR (Claude vision, EU cross-region)"
  type        = string
  default     = "eu.anthropic.claude-haiku-4-5-20251001-v1:0"
}
