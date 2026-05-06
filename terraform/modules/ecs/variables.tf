variable "project_name"           { type = string }
variable "vpc_id"                 { type = string }
variable "private_subnet_ids"     { type = list(string) }
variable "backend_image"          { type = string }
variable "frontend_image"         { type = string }
variable "alb_security_group_id"  { type = string }
variable "backend_target_group_arn"  { type = string }
variable "frontend_target_group_arn" { type = string }

variable "mongodb_uri" {
  type      = string
  sensitive = true
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "jwt_refresh_secret" {
  type      = string
  sensitive = true
}

variable "paystack_secret_key" {
  type      = string
  sensitive = true
}
