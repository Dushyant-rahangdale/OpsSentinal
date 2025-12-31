terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

data "aws_caller_identity" "current" {}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project = var.project_name
      ManagedBy = "Terraform"
    }
  }
}
