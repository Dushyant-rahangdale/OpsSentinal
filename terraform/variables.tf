variable "aws_region" {
  description = "AWS region to deploy resources"
  default     = "us-east-1"
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
  default     = "https://opssentinal.com"
}

variable "project_name" {
  description = "Project name for resource tagging"
  default     = "opssentinal"
}

variable "instance_type" {
  description = "EC2 instance type"
  default     = "t3.small"
}

variable "ssh_key_name" {
  description = "Name of the SSH key pair in AWS to access the instance"
  type        = string
  default     = "OpsSentinal"
}

variable "your_ip" {
  description = "Your personal IP address (CIDR) for SSH access (e.g. 1.2.3.4/32)"
  type        = string
}

variable "app_port" {
  description = "Port the application runs on inside docker"
  default     = 3000
}
