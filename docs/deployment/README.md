---
order: 6
---

# Deployment

Guides for deploying OpsKnight in production.

## In This Section

| Guide                         | Description               |
| ----------------------------- | ------------------------- |
| [Docker](./docker.md)         | Docker Compose deployment |
| [Kubernetes](./kubernetes.md) | Kubernetes deployment     |
| [Helm](./helm.md)             | Helm chart deployment     |
| [Mobile PWA](./mobile-pwa.md) | Progressive Web App       |

## Deployment Options

| Method             | Best For                        |
| ------------------ | ------------------------------- |
| **Docker Compose** | Simple deployments, dev/staging |
| **Kubernetes**     | Production, scaling, HA         |
| **Helm**           | Repeatable, templated releases  |

## Quick Comparison

| Feature             | Docker Compose | Kubernetes |
| ------------------- | -------------- | ---------- |
| Setup Complexity    | Low            | Medium     |
| Scaling             | Manual         | Automatic  |
| High Availability   | No             | Yes        |
| Resource Management | Basic          | Advanced   |

## Prerequisites

### All Deployments

- PostgreSQL database
- SMTP for email (optional)
- Domain name and SSL (production)

### Docker Compose

- Docker Engine 20+
- Docker Compose 2+

### Kubernetes

- Kubernetes 1.24+
- kubectl configured
- Ingress controller
