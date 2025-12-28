#!/bin/bash
# Install Docker
yum update -y
yum install -y docker git
service docker start
usermod -a -G docker ec2-user
chkconfig docker on

# Install Docker Compose
curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Nginx
yum install -y nginx
systemctl enable nginx
systemctl start nginx

# Create a robust Nginx Config for Cloudflare -> Docker
cat <<EOT > /etc/nginx/conf.d/opssentinal.conf
server {
    listen 80;
    server_name _;

    # Security: Hide Nginx Version
    server_tokens off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";

    # Rate Limiting (Needs setup in nginx.conf, but good base here)
    
    # Real IP from Cloudflare
    # (Optional: install realip module for better logs)
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Pass Real IP
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOT

# Remove default nginx server if exists to avoid conflicts
rm -f /etc/nginx/conf.d/default.conf
# Restart Nginx to load config
systemctl restart nginx

# Create app directory
mkdir -p /home/ec2-user/app
chown ec2-user:ec2-user /home/ec2-user/app
