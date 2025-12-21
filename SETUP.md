# OpsGuard Setup Guide

Quick start guide for running OpsGuard locally or in containers.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Docker Setup](#docker-setup)
- [Docker Compose Setup](#docker-compose-setup)

## Prerequisites

### For Local Development
- Node.js 20.x or higher
- PostgreSQL 15.x
- npm or yarn

### For Docker
- Docker 20.10.x or higher
- Docker Compose 2.x or higher

### For Kubernetes
- kubectl
- Access to a Kubernetes cluster
- Docker registry (Docker Hub, AWS ECR, Google GCR, etc.)

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd OpsGuard
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://opsguard:devpassword@localhost:5432/opsguard_db"
NEXTAUTH_SECRET="development-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Start PostgreSQL

Using Docker:
```bash
docker run -d \
  --name opsguard_postgres \
  -e POSTGRES_USER=opsguard \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=opsguard_db \
  -p 5432:5432 \
  postgres:15-alpine
```

Or use your local PostgreSQL installation.

### 5. Run Database Migrations

Generate Prisma Client and run migrations:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

For development with migration creation:
```bash
# Create a new migration (if you've changed schema)
npx prisma migrate dev --name your-migration-name
```

### 6. Create Admin User

```bash
node scripts/opsguard.mjs \
  --user admin \
  --email admin@example.com \
  --password admin \
  --role admin
```

### 7. Start Development Server

```bash
npm run dev
```

The application will be available at **http://localhost:3000**

**Default Login:**
- Email: `admin@example.com`
- Password: `admin`

> [!TIP]
> The development server includes hot reloading, so changes to your code will automatically refresh the application.

## Docker Setup

### Build the Image

```bash
docker build -t opsguard:latest .
```

### Run with Docker

```bash
# Create network
docker network create opsguard-network

# Run PostgreSQL
docker run -d \
  --name opsguard_postgres \
  --network opsguard-network \
  -e POSTGRES_USER=opsguard \
  -e POSTGRES_PASSWORD=opsguard_password \
  -e POSTGRES_DB=opsguard_db \
  -v opsguard_postgres_data:/var/lib/postgresql/data \
  postgres:15-alpine

# Run OpsGuard
docker run -d \
  --name opsguard_app \
  --network opsguard-network \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://opsguard:opsguard_password@opsguard_postgres:5432/opsguard_db" \
  -e NEXTAUTH_SECRET="your-secret-here" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  opsguard:latest
```

Access at **http://localhost:3000**

## Docker Compose Setup

### Development Mode

**Quick Start:**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

This will:
- Start PostgreSQL database
- Start OpsGuard app in development mode with hot reloading
- Run database migrations automatically
- Mount source code for live updates

Access at **http://localhost:3000**

**Stop:**
```bash
docker-compose -f docker-compose.dev.yml down
```

**View Logs:**
```bash
docker-compose -f docker-compose.dev.yml logs -f
```

### Production Mode

**Quick Start:**
```bash
docker-compose up -d
```

This will:
- Build the production Docker image
- Start PostgreSQL database
- Start OpsGuard app in production mode
- Run database migrations automatically

Access at **http://localhost:3000**

**Stop:**
```bash
docker-compose down
```

**View Logs:**
```bash
docker-compose logs -f
```

### Create Admin User (Docker Compose)

```bash
# Development
docker-compose -f docker-compose.dev.yml exec opsguard-app \
  node scripts/opsguard.mjs \
  --user admin \
  --email admin@example.com \
  --password admin \
  --role admin

# Production
docker-compose exec opsguard-app \
  node scripts/opsguard.mjs \
  --user admin \
  --email admin@example.com \
  --password admin \
  --role admin
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `NEXTAUTH_SECRET` | NextAuth.js secret key | Required |
| `NEXTAUTH_URL` | Public URL of the application | Required |
| `NODE_ENV` | Environment (development/production) | `production` |
| `PORT` | Application port | `3000` |

## Troubleshooting

### Port Already in Use

If port 3000 or 5432 is already in use:
```bash
# Find and stop the process
# Windows PowerShell:
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
Stop-Process -Id <PID>
```

### Database Connection Issues

Check if PostgreSQL is running:
```bash
docker ps | grep postgres
```

Restart the database:
```bash
docker restart opsguard_postgres
```

### Reset Database

```bash
# Docker Compose
docker-compose down -v  # Removes volumes
docker-compose up -d

# Then re-run migrations and create admin user
```

## Next Steps

For detailed deployment instructions, see:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [k8s/README.md](k8s/README.md) - Kubernetes deployment guide

## Support

For issues and questions, refer to the main [README.md](README.md)
