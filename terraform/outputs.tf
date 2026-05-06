output "alb_dns_name" {
  description = "Application Load Balancer DNS — your app URL"
  value       = module.alb.alb_dns_name
}

output "ecr_backend_url" {
  description = "ECR URI for backend image"
  value       = module.ecr.backend_repository_url
}

output "ecr_frontend_url" {
  description = "ECR URI for frontend image"
  value       = module.ecr.frontend_repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}