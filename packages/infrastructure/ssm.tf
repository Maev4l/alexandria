data "aws_ssm_parameter" "lek" {
  name = "alexandria.lastevaluatedkey.secret"
}

data "aws_ssm_parameter" "tmdb_access_token" {
  name = "alexandria.tmdb.access.token"
}
