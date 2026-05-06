terraform {
  backend "s3" {
    bucket         = "damolak-tfstate-217019990405"
    key            = "damolak/sznpay/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "damolak-tfstate-lock"
    encrypt        = true
  }
}