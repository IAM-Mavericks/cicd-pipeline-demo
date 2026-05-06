terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

module "vpc" {
  source       = "./modules/vpc"
  project_name = var.project_name
  vpc_cidr     = var.vpc_cidr
}

module "ecr" {
  source       = "./modules/ecr"
  project_name = var.project_name
}

module "alb" {
  source            = "./modules/alb"
  project_name      = var.project_name
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
}

module "ecs" {
  source              = "./modules/ecs"
  project_name        = var.project_name
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  backend_image       = var.backend_image
  frontend_image      = var.frontend_image
  alb_security_group_id        = module.alb.alb_security_group_id
  backend_target_group_arn     = module.alb.backend_target_group_arn
  frontend_target_group_arn    = module.alb.frontend_target_group_arn
  mongodb_uri         = var.mongodb_uri
  jwt_secret          = var.jwt_secret
  jwt_refresh_secret  = var.jwt_refresh_secret
  paystack_secret_key = var.paystack_secret_key
}

module "monitoring" {
  source              = "./modules/monitoring"
  project_name        = var.project_name
  ecs_cluster_name    = module.ecs.cluster_name
  backend_service_name  = module.ecs.backend_service_name
  frontend_service_name = module.ecs.frontend_service_name
}