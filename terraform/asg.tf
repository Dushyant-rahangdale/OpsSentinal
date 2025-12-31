data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023*x86_64"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

resource "aws_launch_template" "app_lt" {
  name_prefix   = "${var.project_name}-lt"
  image_id      = data.aws_ami.amazon_linux_2023.id
  instance_type = var.instance_type
  key_name      = var.ssh_key_name

  vpc_security_group_ids = [aws_security_group.web_sg.id]

  # Spot Instance Configuration
  instance_market_options {
    market_type = "spot"
    spot_options {
      spot_instance_type             = "one-time"
      instance_interruption_behavior = "terminate"
    }
  }

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_profile.name
  }

  # Normalize CRLF->LF to avoid cloud-init /bin/bash^M bad interpreter errors
  user_data = base64encode(replace(templatefile("${path.module}/user_data.sh", {
    github_username         = var.github_username
    github_token            = var.github_token
    db_password             = var.db_password
    nextauth_secret         = var.nextauth_secret
    nextauth_url            = var.nextauth_url
    cloudflare_tunnel_token = var.cloudflare_tunnel_token
    origin_cert             = var.origin_cert
    origin_key              = var.origin_key
    volume_id               = aws_ebs_volume.postgres_data.id
    aws_region              = var.aws_region
  }), "\r\n", "\n"))

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size = 8
      volume_type = "gp3"
    }
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name      = "${var.project_name}-node"
      ManagedBy = "Terraform-ASG"
    }
  }

  # Enforce IMDSv2 (Checkov CKV_AWS_79)
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }
}

resource "aws_autoscaling_group" "app_asg" {
  name                = "${var.project_name}-asg"
  vpc_zone_identifier = data.aws_subnets.default.ids # Use default VPC subnets
  # NOTE: To use the persistent volume, we MUST be in the same AZ.
  # We will filter the subnets below to only include the one in var.availability_zone
  
  min_size            = 1
  max_size            = 1
  desired_capacity    = 1

  launch_template {
    id      = aws_launch_template.app_lt.id
    version = "$Latest"
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 0 # Allow full teardown for replacement if 1 instance
    }
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-asg-node"
    propagate_at_launch = true
  }
}

# Get default subnets
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
  
  # Only select subnets in our target AZ
  filter {
    name   = "availability-zone"
    values = [var.availability_zone]
  }
}
