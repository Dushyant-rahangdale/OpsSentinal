variable "aws_region" {
  description = "AWS region to deploy resources"
  default     = "us-east-1"
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
