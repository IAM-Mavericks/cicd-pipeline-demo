resource "aws_cloudwatch_metric_alarm" "backend_cpu" {
  alarm_name          = "${var.project_name}-backend-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Backend CPU above 80%"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.backend_service_name
  }
}

resource "aws_cloudwatch_metric_alarm" "backend_memory" {
  alarm_name          = "${var.project_name}-backend-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Backend memory above 80%"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.backend_service_name
  }
}

resource "aws_cloudwatch_metric_alarm" "frontend_cpu" {
  alarm_name          = "${var.project_name}-frontend-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Frontend CPU above 80%"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.backend_service_name
  }
}