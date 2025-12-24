# Docker Compose Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- Docker Desktop running (if on Windows/Mac)

## Quick Start

```bash
# 1. Copy environment file
cp env.example .env

# 2. (Optional) Update .env with your values
# Generate NEXTAUTH_SECRET: openssl rand -base64 32

# 3. Start services
docker compose up -d

# 4. View logs
docker compose logs -f
```

The application will be available at http://localhost:3000

## Environment Configuration

Before starting, copy `env.example` to `.env` and update the following:

- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `POSTGRES_PASSWORD` - Use a strong password
- `NEXTAUTH_URL` - Your application URL (default: http://localhost:3000)
- `NEXT_PUBLIC_APP_URL` - Your application URL (default: http://localhost:3000)

## Common Commands

### Service Management

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# Restart services
docker compose restart

# Rebuild and restart
docker compose up -d --build

# View status
docker compose ps
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f opsguard-app
docker compose logs -f opsguard-db
```

### Database Operations

```bash
# Access database shell
docker exec -it opsguard_postgres psql -U opsguard -d opsguard_db

# Run migrations manually
docker exec -it opsguard_app npx prisma migrate deploy

# Create admin user
docker exec -it opsguard_app npm run opsguard -- \
  --user "Admin" \
  --email admin@example.com \
  --password SecurePass123! \
  --role admin
```

### Cleanup

```bash
# Stop and remove containers
docker compose down

# Remove containers and volumes (⚠️ deletes database data)
docker compose down -v

# Remove everything including images
docker compose down -v --rmi all
```

## Troubleshooting

### Docker Daemon Not Running

**Error**: `error during connect: this error may indicate that the docker daemon is not running`

**Solution**: Start Docker Desktop and wait for it to fully initialize.

### Port Already in Use

**Error**: `port is already allocated`

**Solution**: 
- Check what's using the port and stop it, or
- Change ports in `.env` file

### Build Fails

**Solution**:
1. Ensure Docker has enough resources allocated
2. Clear Docker cache: `docker system prune -a`
3. Rebuild: `docker compose build --no-cache`

### Database Connection Issues

**Solution**:
1. Check database is healthy: `docker compose ps`
2. Check database logs: `docker compose logs opsguard-db`
3. Verify `DATABASE_URL` in `.env` matches docker-compose.yml

### Application Not Starting

**Solution**:
1. Check application logs: `docker compose logs opsguard-app`
2. Verify environment variables in `.env`
3. Check if migrations completed: `docker compose logs opsguard-app | grep migrate`

## Data Persistence

Database data is stored in `./data/postgres` directory (configured in `.env` as `POSTGRES_DATA_PATH`).

- **Backup**: Copy the `data/postgres` directory
- **Reset**: Delete `data/postgres` directory and restart containers

## Health Checks

Both services include health checks. View status:

```bash
docker compose ps
```

Check application health endpoint:
```bash
curl http://localhost:3000/api/health
```

## Production Considerations

For production deployment:

1. Change all default passwords
2. Generate secure `NEXTAUTH_SECRET`
3. Use SSL for database connections (`sslmode=require`)
4. Set proper resource limits
5. Configure backup strategy
6. Set up monitoring
7. Use secrets management

See [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) for more details.

## Next Steps

After successful deployment:

1. Create admin user (see commands above)
2. Access application at http://localhost:3000
3. Verify health at http://localhost:3000/api/health
4. Review logs to ensure everything is working

---

**Last Updated**: January 2025
