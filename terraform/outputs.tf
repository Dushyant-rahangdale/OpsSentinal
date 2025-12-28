output "public_ip" {
  description = "The static public IP of the server. Point your Cloudflare DNS 'A Record' here."
  value       = aws_eip.web_eip.public_ip
  sensitive   = true
}

output "ssh_command" {
  description = "Command to SSH into your server"
  value       = "ssh -i path/to/${var.ssh_key_name}.pem ec2-user@${aws_eip.web_eip.public_ip}"
}
