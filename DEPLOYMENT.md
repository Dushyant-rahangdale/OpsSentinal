# OpsGuard Deployment Guide

Comprehensive deployment guide for OpsGuard incident management system.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
  - [Docker Deployment](#docker-deployment)
  - [Docker Compose Deployment](#docker-compose-deployment)
  - [Kubernetes Deployment](#kubernetes-deployment)
- [Configuration](#configuration)
- [Security Considerations](#security-considerations)
- [Monitoring and Logging](#monitoring-and-logging)
- [Backup and Recovery](#backup-and-recovery)

## Overview

OpsGuard can be deployed using:
1. **Docker** - Single container deployment
2. **Docker Compose** - Multi-container local/dev deployment
3. **Kubernetes** - Production-grade orchestrated deployment

## Prerequisites

### General
- Git
- Domain name (for production)
- SSL/TLS certificate (recommended for production)

### Docker Deployment
- Docker Engine 20.10+ 
- Docker Compose 2.0+ (for compose deployment)
- 2GB+ RAM
- 10GB+ disk space

### Kubernetes Deployment
- Kubernetes cluster (v1.24+)
- kubectl configured
- Container registry access
- Ingress controller (optional, for domain routing)
- cert-manager (optional, for auto SSL)

## Deployment Options

### Docker Deployment

#### 1. Build the Image

```bash
cd OpsGuard
docker build -t opsguard:latest .
```

#### 2. Push to Registry (if deploying to remote server)

```bash
# Tag for your registry
docker tag opsguard:latest your-registry.com/opsguard:latest

# Push
docker push your-registry.com/opsguard:latest
```

#### 3. Run Containers

```bash
# Create network
docker network create opsguard-network

# Run PostgreSQL
docker run -d \
  --name opsguard_postgres \
  --network opsguard-network \
  -e POSTGRES_USER=opsguard \
  -e POSTGRES_PASSWORD=$(openssl rand -base64 32) \
  -e POSTGRES_DB=opsguard_db \
  -v opsguard_postgres_data:/var/lib/postgresql/data \
  --restart unless-stopped \
  postgres:15-alpine

# Run OpsGuard
docker run -d \
  --name opsguard_app \
  --network opsguard-network \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://opsguard:YOUR_PASSWORD@opsguard_postgres:5432/opsguard_db" \
  -e NEXTAUTH_SECRET=$(openssl rand -base64 32) \
  -e NEXTAUTH_URL="https://your-domain.com" \
  --restart unless-stopped \
  opsguard:latest
```

### Docker Compose Deployment

#### Production Deployment

**1. Update Environment Variables**

Edit `docker-compose.yml` or create `.env` file:

```env
POSTGRES_USER=opsguard
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=opsguard_db
NEXTAUTH_SECRET=<random-secret>
NEXTAUTH_URL=https://your-domain.com
```

**2. Deploy**

```bash
# Build and start
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

**3. Create Admin User**

```bash
docker-compose exec opsguard-app \
  node scripts/opsguard.mjs \
  --user admin \
  --email admin@yourdomain.com \
  --password <secure-password> \
  --role admin
```

**4. Configure Reverse Proxy (Recommended)**

Use Nginx or Traefik for SSL termination:

Example Nginx configuration:
```nginx
server {
    listen 80;
    server_name opsguard.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name opsguard.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Development Deployment

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Watch logs
docker-compose -f docker-compose.dev.yml logs -f opsguard-app

# Restart after changes
docker-compose -f docker-compose.dev.yml restart opsguard-app
```

### Kubernetes Deployment

See [k8s/README.md](k8s/README.md) for detailed Kubernetes deployment instructions.

**Quick Deploy:**

```bash
# Build and push image
docker build -t your-registry.com/opsguard:v1.0.0 .
docker push your-registry.com/opsguard:v1.0.0

# Update image in k8s/opsguard-deployment.yaml
# Replace 'your-registry/opsguard:latest' with your image

# Deploy to Kubernetes
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres-pvc.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/postgres-service.yaml
kubectl apply -f k8s/opsguard-deployment.yaml
kubectl apply -f k8s/opsguard-service.yaml

# Check deployment
kubectl get pods -n opsguard
kubectl get services -n opsguard
```

## Configuration

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_SECRET` | Yes | Random secret for session encryption | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | Public URL of application | `https://opsguard.example.com` |
| `NODE_ENV` | No | Environment mode | `production` (default) |
| `PORT` | No | Application port | `3000` (default) |

### Database Configuration

The application uses PostgreSQL 15+. Configure connection via `DATABASE_URL`.

**Connection String Format:**
```
postgresql://[user]:[password]@[host]:[port]/[database]
```

### Initial Setup

After deployment, create an admin user:

```bash
# Docker Compose
docker-compose exec opsguard-app \
  node scripts/opsguard.mjs \
  --user admin \
  --email admin@example.com \
  --password secure-password \
  --role admin

# Kubernetes
kubectl exec -it -n opsguard <pod-name> -- \
  node scripts/opsguard.mjs \
  --user admin \
  --email admin@example.com \
  --password secure-password \
  --role admin
```

## Security Considerations

### Production Checklist

- [ ] Change default passwords
- [ ] Generate strong `NEXTAUTH_SECRET`
- [ ] Use HTTPS/TLS
- [ ] Configure firewall rules
- [ ] Enable database encryption at rest
- [ ] Set up regular backups
- [ ] Implement rate limiting (via reverse proxy)
- [ ] Use secrets management (Vault, AWS Secrets Manager, etc.)
- [ ] Enable audit logging
- [ ] Restrict database access to application only
- [ ] Use non-root container user (already configured)
- [ ] Scan images for vulnerabilities

### Secrets Management

**Kubernetes:**
Use external secrets operator or sealed secrets for production.

**Docker Compose:**
Use Docker secrets or environment file with restricted permissions:
```bash
chmod 600 .env
```

## Monitoring and Logging

### Health Checks

Application exposes a health endpoint:
```bash
curl http://localhost:3000/api/health
```

### Logs

**Docker Compose:**
```bash
docker-compose logs -f opsguard-app
docker-compose logs -f opsguard-db
```

**Kubernetes:**
```bash
kubectl logs -f -n opsguard deployment/opsguard-app
kubectl logs -f -n opsguard deployment/opsguard-postgres
```

### Monitoring

Consider integrating:
- **Prometheus** - Metrics collection
- **Grafana** - Metrics visualization
- **Loki** - Log aggregation
- **Sentry** - Error tracking

## Backup and Recovery

### Database Backups

**Docker Compose:**
```bash
# Backup
docker-compose exec opsguard-db pg_dump -U opsguard opsguard_db > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20250101.sql | docker-compose exec -T opsguard-db psql -U opsguard opsguard_db
```

**Kubernetes:**
```bash
# Backup
kubectl exec -n opsguard <postgres-pod> -- \
  pg_dump -U opsguard opsguard_db > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20250101.sql | kubectl exec -i -n opsguard <postgres-pod> -- \
  psql -U opsguard opsguard_db
```

### Automated Backups

Consider using:
- **Velero** (Kubernetes)
- **Cron jobs** with pg_dump
- **Cloud provider snapshots** (AWS RDS, Google Cloud SQL)

## Updating

### Docker Compose

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Run migrations
docker-compose exec opsguard-app npx prisma migrate deploy
```

### Kubernetes

```bash
# Build new version
docker build -t your-registry.com/opsguard:v1.1.0 .
docker push your-registry.com/opsguard:v1.1.0

# Update deployment
kubectl set image -n opsguard deployment/opsguard-app \
  opsguard=your-registry.com/opsguard:v1.1.0

# Watch rollout
kubectl rollout status -n opsguard deployment/opsguard-app
```

## Troubleshooting

### Application Won't Start

Check logs:
```bash
docker-compose logs opsguard-app
```

Common issues:
- Database connection failed - check DATABASE_URL
- Missing NEXTAUTH_SECRET
- Port already in use

### Database Connection Issues

Test connection:
```bash
docker-compose exec opsguard-db psql -U opsguard -d opsguard_db
```

### High Memory Usage

Adjust resource limits in docker-compose.yml or Kubernetes deployment.

## Support

For issues and questions:
- Check the [SETUP.md](SETUP.md) for quick start
- Review [k8s/README.md](k8s/README.md) for Kubernetes specifics
- See main [README.md](README.md) for API documentation
