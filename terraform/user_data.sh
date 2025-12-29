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

# Create app directory
mkdir -p /home/ec2-user/app
cd /home/ec2-user/app

# Write Nginx Config
cat <<EOT > nginx.conf
server {
    listen 80;
    server_name _;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name _;

    ssl_certificate /etc/nginx/certs/origin.crt;
    ssl_certificate_key /etc/nginx/certs/origin.key;

    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Important for Next.js API routes
        proxy_buffering off;
        proxy_request_buffering off;
    }
}

EOT

# Write Docker Compose File
cat <<EOT > docker-compose.yml
services:
  app:
    image: ghcr.io/dushyant-rahangdale/opssentinal-test:latest
    container_name: opssentinal
    restart: always
    expose:
      - "3000"
    env_file:
      - .env
    depends_on:
      - db
    command: >
      sh -c "node node_modules/prisma/build/index.js migrate deploy && node server.js"

  db:
    image: postgres:15-alpine
    container_name: opssentinal_db
    restart: always
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: $${POSTGRES_USER}
      POSTGRES_PASSWORD: $${POSTGRES_PASSWORD}
      POSTGRES_DB: $${POSTGRES_DB}
    ports:
      - "5432:5432"

  nginx:
    image: nginx:alpine
    container_name: opssentinal_nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - app

  watchtower:
    image: containrrr/watchtower
    container_name: watchtower
    restart: always
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 300 --cleanup

volumes:
  postgres_data:
EOT

chown ec2-user:ec2-user docker-compose.yml nginx.conf

# Login to GHCR (Securely passed via Terraform template)
echo "${github_token}" | docker login ghcr.io -u ${github_username} --password-stdin

# Create .env file with injected secrets
cat <<ENV > .env
DATABASE_URL="postgresql://ops_user:${db_password}@db:5432/opssentinal"
NEXTAUTH_SECRET="${nextauth_secret}"
NEXTAUTH_URL="${nextauth_url}"

# Postgres Config for Docker Compose (referenced as env vars)
POSTGRES_USER="ops_user"
POSTGRES_PASSWORD="${db_password}"
POSTGRES_DB="opssentinal"

# GitHub Package Token (if app needs it at runtime)
# GITHUB_TOKEN="${github_token}"
ENV

chown ec2-user:ec2-user .env

# Write Certificates
mkdir -p /home/ec2-user/app/certs
cat <<CERT > /home/ec2-user/app/certs/origin.crt
${origin_cert}
CERT

cat <<KEY > /home/ec2-user/app/certs/origin.key
${origin_key}
KEY

chown -R ec2-user:ec2-user /home/ec2-user/app/certs
chmod 600 /home/ec2-user/app/certs/origin.key

# Pull and Start Logic
# We create a start script so it can be re-run easily
cat <<'SCRIPT' > /home/ec2-user/app/start.sh
#!/bin/bash
cd /home/ec2-user/app

# Pull images
docker-compose pull

# Start the database first to ensure it's available
docker-compose up -d db

# Wait for the database to be ready
echo "Waiting for database to be ready..."
until docker-compose exec -T db pg_isready -U ops_user -d opssentinal; do
  echo "Database is not ready yet... sleeping"
  sleep 2
done

# The stack will now run migrations automatically on startup via the 'command' override

# Start the rest of the stack
docker-compose up -d
SCRIPT

chmod +x /home/ec2-user/app/start.sh
chown ec2-user:ec2-user /home/ec2-user/app/start.sh

# Attempt to pull and run the public application (if available)
echo "Attempting initial deployment..."
docker pull ghcr.io/dushyant-rahangdale/opssentinal-test:latest || echo "Image pull failed. Is it private? Please SSH and login."

# Run it now
/home/ec2-user/app/start.sh
