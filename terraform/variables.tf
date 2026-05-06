variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "sznpay"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "backend_image" {
  description = "Full ECR image URI for backend (set after first ECR push)"
  type        = string
  default     = "217019990405.dkr.ecr.us-east-1.amazonaws.com/sznpay-backend:latest"
}

variable "frontend_image" {
  description = "Full ECR image URI for frontend (set after first ECR push)"
  type        = string
  default     = "217019990405.dkr.ecr.us-east-1.amazonaws.com/sznpay-frontend:latest"
}

variable "mongodb_uri" {
  description = "MongoDB Atlas connection string"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT refresh signing secret"
  type        = string
  sensitive   = true
}

variable "paystack_secret_key" {
  description = "Paystack secret key"
  type        = string
  sensitive   = true
}