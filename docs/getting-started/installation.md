---
order: 1
---

# Installation Guide

This guide covers the recommended ways to install OpsKnight and get a working instance quickly.

## Before You Begin

- Docker Engine 20+ and Docker Compose 2+ (for container installs)
- PostgreSQL 14+ (required for any deployment)
- A stable base URL for production installs (used by auth callbacks)

## Deployment Options

| Method                                    | Best For                          |
| ----------------------------------------- | --------------------------------- |
| [Docker Compose](#docker-compose)         | Development and small deployments |
| [Kubernetes](../deployment/kubernetes.md) | Production and scaling            |
| [Helm](../deployment/helm.md)             | Templated Kubernetes installs     |
| [Local Development](#local-development)   | Contributing and testing          |

---

## Docker Compose

The fastest way to run OpsKnight locally or in a small environment.

### Step 1: Clone and Configure

```bash
git clone https://github.com/dushyant-rahangdale/opsknight.git
cd opsknight
cp env.example .env
```

### Step 2: Set Core Environment Variables

Edit `.env` and set the required values:

```bash
# Required
DATABASE_URL=postgresql://opsknight:your_password@postgres:5432/opsknight_db
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here  # Generate with: openssl rand -base64 32

# Optional - Configure via UI
CRON_SECRET=your-cron-secret
```

> **Note:** In production, set `NEXTAUTH_URL` to your public domain (HTTPS).

### Step 3: Start Services

```bash
docker compose up -d
```

### Step 4: Create Admin User

```bash
docker exec -it opsknight_app npm run opsknight -- \
  --user "Admin" \
  --email admin@example.com \
  --password SecurePass123! \
  --role admin
```

---

## Helm (Kubernetes)

Use the Helm chart for repeatable Kubernetes installs.

Follow the full guide here: [Helm Deployment](../deployment/helm.md).

---

## Local Development

For contributors and developers running the app directly.

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Set up database
npx prisma migrate deploy
npx prisma generate

# Start development server
npm run dev
```

---

## Verify the Install

After installation, verify:

1. Application loads at `http://localhost:3000`
2. You can log in with the admin account
3. Dashboard displays without errors
4. You can create a service successfully

---

## Common Issues

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker compose logs postgres

# Reset database
docker compose down -v
docker compose up -d
```

### Port Conflicts

If port 3000 is in use, modify `docker-compose.yml`:

```yaml
ports:
  - '3001:3000' # Use port 3001 instead
```

### Login Redirects

If the login redirects unexpectedly:

- Confirm `NEXTAUTH_URL` matches your real base URL.
- Regenerate `NEXTAUTH_SECRET` if sessions fail to validate.
