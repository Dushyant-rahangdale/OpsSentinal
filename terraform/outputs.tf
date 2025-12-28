output "asg_name" {
  description = "Name of the Auto Scaling Group"
  value       = aws_autoscaling_group.app_asg.name
}

output "security_group_id" {
  description = "The ID of the security group, needed for GitHub Actions to authorize itself."
  value       = aws_security_group.web_sg.id
}

# Note: To get the instance IPv6 address for Cloudflare DNS:
# 1. Go to EC2 Console > Instances
# 2. Find the instance with tag "opssentinal-asg-node"
# 3. Copy the "IPv6 IPs" value
# 4. Create an AAAA record in Cloudflare pointing to this IPv6 address
