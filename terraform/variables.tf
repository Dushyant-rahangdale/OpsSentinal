variable "aws_region" {
  description = "AWS region to deploy resources"
}

variable "availability_zone" {
  description = "Availability Zone for the persistent volume and ASG"
  default     = "us-east-1a"
}

variable "github_username" {
  description = "GitHub username to pull container image"
  type        = string
}

variable "github_token" {
  description = "GitHub Personal Access Token (CR_PAT) to pull container image"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Postgres DB password"
  type        = string
  sensitive   = true
}

variable "nextauth_secret" {
  description = "NextAuth Secret used for encryption"
  type        = string
  sensitive   = true
}

variable "nextauth_url" {
  description = "Full URL of your application (e.g. https://status.example.com)"
  type        = string
  default     = "https://opsknight.com"
}

variable "project_name" {
  description = "Project name for resource tagging"
  default     = "opsknight"
}

variable "instance_type" {
  description = "EC2 instance type"
}

variable "ssh_key_name" {
  description = "Name of the SSH key pair in AWS to access the instance"
  type        = string
  default     = "OpsKnight"
}

variable "your_ip" {
  description = "Your personal IP address (CIDR) for SSH access (e.g. 1.2.3.4/32)"
  type        = string
}

variable "your_ipv6" {
  description = "Your IPv6 subnet for SSH access (CIDR notation, e.g., 2401:4900:8838:c07c::/64)"
  type        = string
  default     = "" # Optional, only needed if you use IPv6
}

variable "app_port" {
  description = "Port the application runs on inside docker"
  default     = 3000
}

variable "origin_cert" {
  description = "Cloudflare Origin CA Certificate"
  type        = string
  sensitive   = true
}

variable "origin_key" {
  description = "Cloudflare Origin CA Private Key"
  type        = string
  sensitive   = true
}

variable "cloudflare_tunnel_token" {
  description = "Cloudflare Tunnel (cloudflared) token used for `cloudflared service install --token`"
  type        = string
  sensitive   = true
}
