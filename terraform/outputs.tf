output "asg_name" {
  description = "Name of the Auto Scaling Group"
  value       = aws_autoscaling_group.app_asg.name
}

output "security_group_id" {
  description = "The ID of the security group, needed for GitHub Actions to authorize itself."
  value       = aws_security_group.web_sg.id
}
