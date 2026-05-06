output "backend_cpu_alarm_name" {
  value = aws_cloudwatch_metric_alarm.backend_cpu.alarm_name
}

output "backend_memory_alarm_name" {
  value = aws_cloudwatch_metric_alarm.backend_memory.alarm_name
}
