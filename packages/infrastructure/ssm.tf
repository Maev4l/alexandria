

data "aws_ssm_parameter" "google_client_id" {
  name            = "alexandria.google.client.id"
  with_decryption = true
}

data "aws_ssm_parameter" "google_client_secret" {
  name            = "alexandria.google.client.secret"
  with_decryption = true
}
