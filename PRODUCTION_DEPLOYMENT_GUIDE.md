# OpsGuard Production Deployment Guide

This guide covers all aspects of deploying OpsGuard to production, including security, performance, monitoring, and best practices.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Security Hardening](#security-hardening)
6. [Database Setup](#database-setup)
7. [Monitoring & Observability](#monitoring--observability)
8. [Backup & Recovery](#backup--recovery)
9. [Scaling & Performance](#scaling--performance)
10. [Troubleshooting](#troubleshooting)

## Pre-Deployment Checklist

### Security Checklist

- [ ] Change all default passwords
- [ ] Generate secure `NEXTAUTH_SECRET` (use `openssl rand -base64 32`)
- [ ] Configure strong database passwords
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Enable security headers
- [ ] Review and restrict CORS origins
- [ ] Configure rate limiting
- [ ] Set up secrets management
- [ ] Enable audit logging

### Infrastructure Checklist

- [ ] Database backups configured
- [ ] Monitoring and alerting set up
- [ ] Log aggregation configured
- [ ] Health checks configured
- [ ] Resource limits defined
- [ ] Auto-scaling configured (if applicable)
- [ ] Load balancer configured
- [ ] DNS configured
- [ ] SSL/TLS certificates installed

### Application Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Initial admin user created
- [ ] API keys generated (if needed)
- [ ] Email/SMS providers configured
- [ ] Error tracking configured (Sentry, etc.)

## Environment Configuration

### Required Environment Variables

Copy `env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require

# NextAuth
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# Application
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# Security
NEXT_TELEMETRY_DISABLED=1
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

### Generating Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate database password
openssl rand -base64 24
```

## Docker Deployment

### Quick Start

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Create admin user
docker exec -it opsguard_app npm run opsguard -- \
  --user "Admin" \
  --email admin@example.com \
  --password SecurePass123! \
  --role admin
```

### Production Docker Compose

1. **Update environment variables** in `docker-compose.yml` or use `.env` file
2. **Configure volumes** for persistent data
3. **Set resource limits** appropriately
4. **Enable logging** rotation

### Docker Security Best Practices

- Use non-root user (already configured)
- Keep images updated
- Scan images for vulnerabilities
- Use secrets management
- Enable Docker content trust
- Limit container capabilities

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (v1.24+)
- kubectl configured
- Container registry access
- Storage class configured

### Deployment Steps

1. **Create namespace:**
```bash
kubectl apply -f k8s/namespace.yaml
```

2. **Create secrets:**
```bash
# Generate secrets
kubectl create secret generic opsguard-secrets \
  --from-literal=POSTGRES_USER=opsguard \
  --from-literal=POSTGRES_PASSWORD=$(openssl rand -base64 24) \
  --from-literal=NEXTAUTH_SECRET=$(openssl rand -base64 32) \
  -n opsguard
```

3. **Update ConfigMap:**
```bash
# Edit k8s/configmap.yaml with your domain
kubectl apply -f k8s/configmap.yaml
```

4. **Deploy database:**
```bash
kubectl apply -f k8s/postgres-pvc.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/postgres-service.yaml
```

5. **Deploy application:**
```bash
kubectl apply -f k8s/service-account.yaml
kubectl apply -f k8s/opsguard-deployment.yaml
kubectl apply -f k8s/opsguard-service.yaml
```

6. **Deploy additional resources:**
```bash
kubectl apply -f k8s/pod-disruption-budget.yaml
kubectl apply -f k8s/network-policy.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/ingress.yaml
```

7. **Create admin user:**
```bash
POD_NAME=$(kubectl get pod -n opsguard -l app=opsguard-app -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it -n opsguard $POD_NAME -- \
  node scripts/opsguard.mjs \
  --user "Admin" \
  --email admin@example.com \
  --password SecurePass123! \
  --role admin
```

### Kubernetes Production Features

- **Horizontal Pod Autoscaling (HPA)**: Automatically scales based on CPU/memory
- **Pod Disruption Budgets**: Ensures availability during updates
- **Network Policies**: Restricts pod-to-pod communication
- **Resource Limits**: Prevents resource exhaustion
- **Security Contexts**: Runs as non-root user
- **Health Checks**: Liveness, readiness, and startup probes

## Security Hardening

### Application Security

1. **Security Headers**: Configured in `next.config.ts`
2. **CORS**: Restricted to allowed origins
3. **Rate Limiting**: Configured in middleware
4. **Input Validation**: Using Zod schemas
5. **SQL Injection**: Protected by Prisma
6. **XSS Protection**: Content Security Policy headers

### Infrastructure Security

1. **Network Policies**: Restrict pod communication
2. **Secrets Management**: Use Kubernetes secrets or external secret managers
3. **TLS/SSL**: Enable HTTPS everywhere
4. **Firewall Rules**: Restrict access to necessary ports only
5. **Regular Updates**: Keep images and dependencies updated

### Database Security

1. **Encrypted Connections**: Use SSL/TLS for database connections
2. **Strong Passwords**: Use complex, randomly generated passwords
3. **Limited Access**: Restrict database access to application pods only
4. **Backup Encryption**: Encrypt database backups
5. **Audit Logging**: Enable PostgreSQL audit logging

## Database Setup

### Initial Setup

```bash
# Run migrations
npx prisma migrate deploy

# Seed initial data (if needed)
npx prisma db seed
```

### Production Database Configuration

For production, consider:
- Managed database service (AWS RDS, Google Cloud SQL, Azure Database)
- Read replicas for scaling
- Connection pooling (PgBouncer)
- Automated backups
- Point-in-time recovery

### Connection Pooling

Add to `DATABASE_URL`:
```
postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10
```

## Monitoring & Observability

### Health Checks

Health endpoint: `GET /api/health`

Returns:
- Application status
- Database connectivity
- Memory usage
- Uptime

### Metrics

Configure Prometheus scraping:
```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "3000"
  prometheus.io/path: "/api/metrics"
```

### Logging

1. **Application Logs**: Use structured logging
2. **Access Logs**: Log all API requests
3. **Error Logs**: Track errors with stack traces
4. **Audit Logs**: Log all user actions

### Recommended Tools

- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **Loki**: Log aggregation
- **Sentry**: Error tracking
- **Datadog/New Relic**: APM

## Backup & Recovery

### Database Backups

**Automated Backup (Kubernetes CronJob):**
```bash
kubectl apply -f k8s/backup-cronjob.yaml
```

**Manual Backup:**
```bash
# Docker
docker exec opsguard_postgres pg_dump -U opsguard opsguard_db > backup.sql

# Kubernetes
kubectl exec -n opsguard <postgres-pod> -- \
  pg_dump -U opsguard opsguard_db > backup.sql
```

**Restore:**
```bash
# Docker
cat backup.sql | docker exec -i opsguard_postgres psql -U opsguard opsguard_db

# Kubernetes
cat backup.sql | kubectl exec -i -n opsguard <postgres-pod> -- \
  psql -U opsguard opsguard_db
```

### Backup Strategy

- **Frequency**: Daily full backups
- **Retention**: 30 days daily, 12 months monthly
- **Testing**: Test restore monthly
- **Storage**: Off-site, encrypted

## Scaling & Performance

### Horizontal Scaling

Kubernetes HPA automatically scales based on:
- CPU utilization (target: 70%)
- Memory utilization (target: 80%)

### Vertical Scaling

Adjust resource limits in deployment:
```yaml
resources:
  requests:
    memory: "1Gi"
    cpu: "1000m"
  limits:
    memory: "4Gi"
    cpu: "4000m"
```

### Database Scaling

- Use read replicas for read-heavy workloads
- Implement connection pooling
- Optimize queries and indexes
- Consider sharding for very large datasets

### Performance Optimization

1. **CDN**: Use CDN for static assets
2. **Caching**: Implement Redis for session/cache
3. **Database Indexes**: Optimize frequently queried fields
4. **Query Optimization**: Use Prisma query optimization
5. **Image Optimization**: Use Next.js Image component

## Troubleshooting

### Common Issues

**Pods Not Starting:**
```bash
kubectl describe pod -n opsguard <pod-name>
kubectl logs -n opsguard <pod-name>
```

**Database Connection Issues:**
```bash
# Test connection
kubectl exec -it -n opsguard <app-pod> -- \
  sh -c 'apk add postgresql-client && psql $DATABASE_URL'
```

**High Memory Usage:**
- Check for memory leaks
- Review resource limits
- Enable garbage collection logging

**Slow Queries:**
- Enable PostgreSQL slow query log
- Review database indexes
- Analyze query plans

### Debug Commands

```bash
# Check pod status
kubectl get pods -n opsguard

# View logs
kubectl logs -f -n opsguard deployment/opsguard-app

# Check events
kubectl get events -n opsguard --sort-by='.lastTimestamp'

# Check resource usage
kubectl top pods -n opsguard

# Exec into pod
kubectl exec -it -n opsguard <pod-name> -- sh
```

## Additional Resources

- [CLI Production Guide](./CLI_PRODUCTION_GUIDE.md)
- [Kubernetes Deployment Guide](./k8s/README.md)
- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

## Support

For production issues:
1. Check application logs
2. Review health endpoint
3. Check database connectivity
4. Review resource usage
5. Check network policies

---

**Last Updated**: January 2025

