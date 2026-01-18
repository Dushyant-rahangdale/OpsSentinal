---
order: 1
---

# Getting Started

This section covers everything you need to get OpsKnight up and running.

## In This Section

| Guide                               | Description                                         |
| ----------------------------------- | --------------------------------------------------- |
| [Installation](./installation.md)   | Deploy with Docker, Docker Compose, or Kubernetes   |
| [Configuration](./configuration.md) | Environment variables reference                     |
| [First Steps](./first-steps.md)     | Create your first admin user, service, and incident |

## Prerequisites

Before installing OpsKnight, ensure you have:

- **Docker** (v20+) and **Docker Compose** (v2+) for containerized deployment
- **PostgreSQL** (v14+) if running without Docker
- **Node.js** (v18+) for local development

## Quick Start

The fastest way to get started is with Docker Compose:

```bash
# Clone the repository
git clone https://github.com/dushyant-rahangdale/opsknight.git
cd opsknight

# Copy environment file
cp env.example .env

# Start services
docker compose up -d

# Create admin user
docker exec -it opsknight_app npm run opsknight -- \
  --user "Admin" \
  --email admin@example.com \
  --password SecurePass123! \
  --role admin
```

Access the application at **http://localhost:3000**

## Next Steps

After installation:

1. [Create your first admin user](./first-steps.md#create-admin-user)
2. [Add a service](./first-steps.md#create-service)
3. [Set up on-call schedules](../core-concepts/schedules.md)
4. [Configure notifications](../administration/notifications.md)
