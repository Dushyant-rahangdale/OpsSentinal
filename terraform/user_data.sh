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

# Write Docker Compose File
cat <<EOT > docker-compose.yml
services:
  app:
    image: ghcr.io/dushyant-rahangdale/opssentinal-test:latest
    container_name: opssentinal
    restart: always
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - db

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

volumes:
  postgres_data:
EOT

chown ec2-user:ec2-user docker-compose.yml

# Login to GHCR (Securely passed via Terraform template)
echo "${github_token}" | docker login ghcr.io -u ${github_username} --password-stdin

# Pull and Start Logic
# We create a start script so it can be re-run easily
cat <<'SCRIPT' > /home/ec2-user/app/start.sh
#!/bin/bash
cd /home/ec2-user/app
# Ensure .env exists (User must populate it manually or via Secrets Manager in real prod)
if [ ! -f .env ]; then
  echo "waiting for .env file..."
  # Just a placeholder to prevent crash loop if .env missing
  touch .env
fi

docker-compose pull
docker-compose up -d
SCRIPT

chmod +x /home/ec2-user/app/start.sh
chown ec2-user:ec2-user /home/ec2-user/app/start.sh

# Attempt to pull and run the public application (if available)
echo "Attempting initial deployment..."
docker pull ghcr.io/dushyant-rahangdale/opssentinal-test:latest || echo "Image pull failed. Is it private? Please SSH and login."

# Run it now
/home/ec2-user/app/start.sh
