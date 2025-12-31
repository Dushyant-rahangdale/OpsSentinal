locals {
  # Official Cloudflare IP Ranges (https://www.cloudflare.com/ips/)
  cloudflare_ipv4 = [
    "173.245.48.0/20",
    "103.21.244.0/22",
    "103.22.200.0/22",
    "103.31.4.0/22",
    "141.101.64.0/18",
    "108.162.192.0/18",
    "190.93.240.0/20",
    "188.114.96.0/20",
    "197.234.240.0/22",
    "198.41.128.0/17",
    "162.158.0.0/15",
    "104.16.0.0/13",
    "104.24.0.0/14",
    "172.64.0.0/13",
    "131.0.72.0/22"
  ]

  cloudflare_ipv6 = [
    "2400:cb00::/32",
    "2606:4700::/32",
    "2803:f800::/32",
    "2405:b500::/32",
    "2405:8100::/32",
    "2a06:98c0::/29",
    "2c0f:f248::/32"
  ]
}

resource "aws_security_group" "web_sg" {
  name        = "${var.project_name}-web-sg"
  description = "Security group for OpsSentinal web server (Cloudflare only)"

  # SSH Access - Restricted to your IP
  ingress {
    from_port        = 22
    to_port          = 22
    protocol         = "tcp"
    cidr_blocks      = [var.your_ip]
    ipv6_cidr_blocks = var.your_ipv6 != "" ? [var.your_ipv6] : []
    description      = "SSH access from admin IP (IPv4 and IPv6)"
  }

  # App Port - Restricted to your IP
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = [var.your_ip]
    description = "Next.js App access from admin IP"
  }

  # HTTP - Only from Cloudflare
  ingress {
    from_port        = 80
    to_port          = 80
    protocol         = "tcp"
    cidr_blocks      = local.cloudflare_ipv4
    ipv6_cidr_blocks = local.cloudflare_ipv6
    description      = "HTTP from Cloudflare"
  }

  # HTTPS - Only from Cloudflare
  ingress {
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    cidr_blocks      = local.cloudflare_ipv4
    ipv6_cidr_blocks = local.cloudflare_ipv6
    description      = "HTTPS from Cloudflare"
  }

  # Egress - Allow all outbound traffic (updating packages, pulling docker images)
  # checkov:skip=CKV_AWS_382: Full egress is required for package updates and container image pulls
  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
    description      = "Allow all outbound traffic"
  }

  tags = {
    Name = "${var.project_name}-sg"
  }
}
