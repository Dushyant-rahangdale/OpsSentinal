#!/bin/bash
set -euo pipefail

# Log everything for debugging
exec > >(tee /var/log/user-data.log | logger -t user-data -s 2>/dev/null) 2>&1
echo "==> user-data start: $(date -Is)"

# ---------------------------
# Base packages (AL2023)
# ---------------------------
dnf update -y
dnf install -y docker git curl-minimal unzip util-linux coreutils

systemctl enable --now docker
usermod -a -G docker ec2-user || true

# ---------------------------
# Install Docker Compose (binary)
# NOTE: GitHub "latest" is okay, but pinning is better in prod.
# ---------------------------
curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
  -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
/usr/local/bin/docker-compose version || true

# ---------------------------
# Install Cloudflare Tunnel (cloudflared)
# ---------------------------
cat <<'EOF' > /etc/yum.repos.d/cloudflared.repo
[cloudflared]
name=Cloudflared
baseurl=https://pkg.cloudflare.com/cloudflared/rpm
enabled=1
gpgcheck=0
EOF

dnf clean all
dnf makecache -y
dnf install -y cloudflared
cloudflared --version || true

# token is passed as ARGUMENT (not --token)
cloudflared service install "${cloudflare_tunnel_token}"

systemctl daemon-reload
systemctl enable --now cloudflared
systemctl status cloudflared || true

# ---------------------------
# Create app directory
# ---------------------------
mkdir -p /home/ec2-user/app
cd /home/ec2-user/app

# ---------------------------
# Install AWS CLI v2 (needed for attach-volume)
# ---------------------------
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip -q awscliv2.zip
./aws/install
/usr/local/bin/aws --version || true

# ---------------------------
# Attach + Mount Persistent EBS Volume (Postgres)
# ---------------------------
TOKEN="$(curl -fsS -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")"

INSTANCE_ID="$(curl -fsS -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/instance-id)"

REGION="${aws_region}"
VOLUME_ID="${volume_id}"

echo "Attaching volume $VOLUME_ID to instance $INSTANCE_ID in region $REGION"

aws ec2 attach-volume \
  --volume-id "$VOLUME_ID" \
  --instance-id "$INSTANCE_ID" \
  --device /dev/sdf \
  --region "$REGION" || true

echo "Waiting for volume to become available as a block device..."
DEVICE=""

# Prefer stable by-id path on Nitro
BYID_PATH="/dev/disk/by-id/nvme-Amazon_Elastic_Block_Store_${volume_id}"

for i in {1..180}; do
  if [ -e "$BYID_PATH" ]; then
    DEVICE="$(readlink -f "$BYID_PATH")"
    break
  fi

  if [ -b "/dev/sdf" ]; then
    DEVICE="/dev/sdf"
    break
  fi

  # Fallback: match NVMe SERIAL against volume-id without dashes
  VOL_NODASH="$(echo "$VOLUME_ID" | tr -d '-')"
  NVME_DEVICE="$(lsblk -d -o NAME,SERIAL 2>/dev/null | grep -F "$VOL_NODASH" | awk '{print $1}' || true)"
  if [ -n "$NVME_DEVICE" ] && [ -b "/dev/$NVME_DEVICE" ]; then
    DEVICE="/dev/$NVME_DEVICE"
    break
  fi

  sleep 2
done

# FIX: correct variable check (was "$${DEVICE}" which is wrong in bash)
if [ -z "$DEVICE" ]; then
  echo "ERROR: Volume device not found after waiting. Exiting."
  lsblk || true
  exit 1
fi

echo "Volume device detected at: $DEVICE"

MOUNT_POINT="/mnt/postgres_data"
mkdir -p "$MOUNT_POINT"

# Format if needed (no filesystem signature)
if ! file -s "$DEVICE" | grep -qi "filesystem"; then
  echo "Formatting $DEVICE as ext4..."
  mkfs.ext4 -F "$DEVICE"
fi

# Mount (idempotent-ish)
if ! mountpoint -q "$MOUNT_POINT"; then
  mount "$DEVICE" "$MOUNT_POINT"
fi

# Persist in fstab (avoid duplicate lines)
FSTAB_LINE="$DEVICE $MOUNT_POINT ext4 defaults,nofail 0 2"
grep -qF "$FSTAB_LINE" /etc/fstab || echo "$FSTAB_LINE" >> /etc/fstab

# ---------------------------
# Postgres persistence FIX:
# Don't mount PGDATA directly to filesystem root (lost+found issue).
# Use a subdirectory.
# ---------------------------
PGDATA_DIR="$MOUNT_POINT/pgdata"
mkdir -p "$PGDATA_DIR"

# Ensure permissions (70:70 is standard postgres uid:gid in alpine image)
chown -R 70:70 "$PGDATA_DIR"
chmod 700 "$PGDATA_DIR"

# ---------------------------
# Write Nginx Config
# ---------------------------
cat <<'EOT' > nginx.conf
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Since Cloudflare is HTTPS externally, force https here for apps like NextAuth
        proxy_set_header X-Forwarded-Proto https;

        proxy_buffering off;
        proxy_request_buffering off;
    }
}
EOT

# ---------------------------
# Write Docker Compose File
# IMPORTANT: use $${VAR} where you want literal $${VAR} in the rendered file
# (so Terraform templatefile doesn't try to interpret it).
# ---------------------------
cat <<'EOT' > docker-compose.yml
services:
  app:
    image: ghcr.io/dushyant-rahangdale/opsknight-test:latest
    container_name: opsknight
    restart: always
    expose:
      - "3000"
    env_file:
      - .env
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    container_name: opsknight_db
    restart: always
    volumes:
      - /mnt/postgres_data/pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: $${POSTGRES_USER}
      POSTGRES_PASSWORD: $${POSTGRES_PASSWORD}
      POSTGRES_DB: $${POSTGRES_DB}
    ports:
      - "5432:5432"

  nginx:
    image: nginx:alpine
    container_name: opsknight_nginx
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
    image: containrrr/watchtower:latest
    container_name: watchtower
    restart: always
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_NOTIFICATIONS=slack
      - WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL=$${WATCHTOWER_SLACK_HOOK_URL}
      - WATCHTOWER_NOTIFICATION_SLACK_IDENTIFIER=opsknight
    command: --interval 300 --cleanup --notifications-level=info
EOT

chown ec2-user:ec2-user docker-compose.yml nginx.conf

# ---------------------------
# Login to GHCR (don’t kill userdata if it fails)
# ---------------------------
echo "${github_token}" | docker login ghcr.io -u "${github_username}" --password-stdin || echo "GHCR login failed"

# ---------------------------
# Create .env file
# ---------------------------
cat <<ENV > .env
DATABASE_URL=postgresql://ops_user:${db_password}@db:5432/opsknight
NEXTAUTH_SECRET=${nextauth_secret}
NEXTAUTH_URL=${nextauth_url}

POSTGRES_USER=ops_user
POSTGRES_PASSWORD=${db_password}
POSTGRES_DB=opsknight

# Watchtower Slack hook (recommended to pass from TF var)
WATCHTOWER_SLACK_HOOK_URL="${watchtower_slack_hook_url}"
ENV

chown ec2-user:ec2-user .env
chmod 600 .env

# ---------------------------
# Write Certificates
# ---------------------------
mkdir -p /home/ec2-user/app/certs

cat <<CERT > /home/ec2-user/app/certs/origin.crt
${origin_cert}
CERT

cat <<KEY > /home/ec2-user/app/certs/origin.key
${origin_key}
KEY

chown -R ec2-user:ec2-user /home/ec2-user/app/certs
chmod 600 /home/ec2-user/app/certs/origin.key

# ---------------------------
# Start script (separate, idempotent)
# ---------------------------
cat <<'SCRIPT' > /home/ec2-user/app/start.sh
#!/bin/bash
set -euo pipefail
cd /home/ec2-user/app

/usr/local/bin/docker-compose pull

# Start DB first
/usr/local/bin/docker-compose up -d db

echo "Waiting for database to be ready..."
until /usr/local/bin/docker-compose exec -T db pg_isready -U ops_user -d opsknight >/dev/null 2>&1; do
  sleep 2
done

# Start everything
/usr/local/bin/docker-compose up -d
SCRIPT

chmod +x /home/ec2-user/app/start.sh
chown ec2-user:ec2-user /home/ec2-user/app/start.sh

/home/ec2-user/app/start.sh

echo "==> user-data end: $(date -Is)"
