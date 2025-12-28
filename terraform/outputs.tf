output "public_ip" {
  description = "The static public IP of the server. Point your Cloudflare DNS 'A Record' here."
  value       = aws_eip.web_eip.public_ip
}

output "security_group_id" {
  description = "The ID of the security group, needed for GitHub Actions to authorize itself."
  value       = aws_security_group.web_sg.id
}
