# OpsGuard CLI - Production Usage Guide

The OpsGuard CLI (`opsguard`) is a user management tool for creating and updating users in your OpsGuard instance. This guide covers how to use it in various production environments.

## Overview

The CLI allows you to:
- Create new users with specific roles
- Update existing user passwords and roles
- Manage user accounts from the command line

## Prerequisites

- Node.js 20+ installed (for local usage)
- Access to the production database
- `DATABASE_URL` environment variable or `.env` file configured
- Required dependencies installed (`@prisma/client`, `bcryptjs`)

## CLI Usage

### Basic Syntax

```bash
opsguard --user <name> --email <email> --password <password> [--role <role>] [--update]
```

### Options

- `--user <name>` - User's display name (required)
- `--email <email>` - User's email address (required)
- `--password <password>` - User's password (required)
- `--role <role>` - User role: `admin`, `responder`, or `user` (default: `user`)
- `--update` - Update an existing user instead of creating a new one
- `--help` or `-h` - Show help message

### Examples

**Create an admin user:**
```bash
opsguard --user "Admin User" --email admin@example.com --password SecurePass123! --role admin
```

**Create a responder user:**
```bash
opsguard --user "John Doe" --email john@example.com --password SecurePass123! --role responder
```

**Update an existing user's password:**
```bash
opsguard --user "Admin User" --email admin@example.com --password NewSecurePass123! --role admin --update
```

## Production Deployment Methods

### 1. Using npm Script (Local/Development)

If you have the project cloned locally:

```bash
# Install dependencies
npm install

# Run the CLI
npm run opsguard -- --user admin --email admin@example.com --password admin123 --role admin
```

### 2. Using Docker

#### Option A: Using Docker Exec (Recommended for Production)

If your application is running in a Docker container:

```bash
# Find your container
docker ps

# Execute the CLI inside the container
docker exec -it <container-name> node scripts/opsguard.mjs \
  --user admin \
  --email admin@example.com \
  --password SecurePass123! \
  --role admin
```

#### Option B: Using Docker Run (One-off Container)

For a one-time execution without running the full application:

```bash
# Build the image first (if not already built)
docker build -t opsguard:latest .

# Run the CLI in a temporary container
docker run --rm \
  --env-file .env \
  opsguard:latest \
  node scripts/opsguard.mjs \
  --user admin \
  --email admin@example.com \
  --password SecurePass123! \
  --role admin
```

**Note:** Ensure your `.env` file contains `DATABASE_URL` pointing to your production database.

#### Option C: Using Docker Compose

If using Docker Compose:

```bash
# Execute in the running service
docker-compose exec opsguard node scripts/opsguard.mjs \
  --user admin \
  --email admin@example.com \
  --password SecurePass123! \
  --role admin
```

### 3. Using Kubernetes

#### Option A: Exec into Running Pod (Recommended)

```bash
# Get the pod name
POD_NAME=$(kubectl get pod -n opsguard -l app=opsguard-app -o jsonpath='{.items[0].metadata.name}')

# Execute the CLI
kubectl exec -it -n opsguard $POD_NAME -- \
  node scripts/opsguard.mjs \
  --user admin \
  --email admin@example.com \
  --password SecurePass123! \
  --role admin
```

#### Option B: Using kubectl run (One-off Pod)

For a one-time execution:

```bash
kubectl run opsguard-cli \
  --image=your-registry.com/opsguard:v1.0.0 \
  --rm -it --restart=Never \
  --env="DATABASE_URL=postgresql://user:pass@postgres-service:5432/opsguard_db" \
  -- node scripts/opsguard.mjs \
  --user admin \
  --email admin@example.com \
  --password SecurePass123! \
  --role admin
```

#### Option C: Using Kubernetes Job

For automated or scheduled user creation, create a Kubernetes Job:

**Create `k8s/cli-job.yaml`:**
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: opsguard-create-user
  namespace: opsguard
spec:
  template:
    spec:
      containers:
      - name: opsguard-cli
        image: your-registry.com/opsguard:v1.0.0
        command:
        - node
        - scripts/opsguard.mjs
        args:
        - --user
        - "Admin User"
        - --email
        - admin@example.com
        - --password
        - $(PASSWORD)
        - --role
        - admin
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: opsguard-secrets
              key: DATABASE_URL
        - name: PASSWORD
          valueFrom:
            secretKeyRef:
              name: opsguard-secrets
              key: ADMIN_PASSWORD
      restartPolicy: Never
  backoffLimit: 3
```

**Apply the job:**
```bash
kubectl apply -f k8s/cli-job.yaml

# Check job status
kubectl get jobs -n opsguard

# View logs
kubectl logs -n opsguard job/opsguard-create-user

# Clean up after completion
kubectl delete job opsguard-create-user -n opsguard
```

### 4. Using Cloud Platforms

#### AWS ECS/Fargate

```bash
# Execute in running task
aws ecs execute-command \
  --cluster your-cluster \
  --task <task-id> \
  --container opsguard \
  --command "node scripts/opsguard.mjs --user admin --email admin@example.com --password SecurePass123! --role admin" \
  --interactive
```

#### Google Cloud Run

```bash
# Execute in Cloud Run service
gcloud run services execute opsguard \
  --region us-central1 \
  --command "node scripts/opsguard.mjs --user admin --email admin@example.com --password SecurePass123! --role admin"
```

#### Azure Container Instances

```bash
# Execute in container group
az container exec \
  --resource-group your-rg \
  --name opsguard \
  --exec-command "node scripts/opsguard.mjs --user admin --email admin@example.com --password SecurePass123! --role admin"
```

### 5. Direct Node.js Execution

If you have direct access to the production server:

```bash
# Navigate to application directory
cd /path/to/opsguard

# Ensure dependencies are installed
npm install --production

# Run the CLI
node scripts/opsguard.mjs \
  --user admin \
  --email admin@example.com \
  --password SecurePass123! \
  --role admin
```

## Environment Configuration

The CLI requires the `DATABASE_URL` environment variable. It will:

1. First check if `DATABASE_URL` is already set in the environment
2. If not found, load from `.env` file in the current directory
3. Throw an error if still not found

### Setting DATABASE_URL

**For Docker:**
```bash
docker exec -it <container> \
  sh -c 'DATABASE_URL="postgresql://user:pass@host:5432/db" node scripts/opsguard.mjs --user admin --email admin@example.com --password pass --role admin'
```

**For Kubernetes:**
```bash
kubectl exec -it -n opsguard <pod-name> -- \
  sh -c 'DATABASE_URL="postgresql://user:pass@host:5432/db" node scripts/opsguard.mjs --user admin --email admin@example.com --password pass --role admin'
```

**For local execution:**
```bash
export DATABASE_URL="postgresql://user:pass@host:5432/db"
node scripts/opsguard.mjs --user admin --email admin@example.com --password pass --role admin
```

## User Roles

The CLI supports three user roles:

- **`admin`** - Full administrative access
- **`responder`** - Can manage incidents and respond to alerts
- **`user`** - Standard user with read access (default)

Role values are case-insensitive and will be converted to uppercase internally.

## Security Best Practices

### 1. Password Security

**❌ DON'T:**
- Pass passwords in plain text on command line (visible in process lists)
- Commit passwords to version control
- Use weak passwords

**✅ DO:**
- Use environment variables for passwords
- Use strong, randomly generated passwords
- Rotate passwords regularly
- Use secrets management systems (Kubernetes Secrets, AWS Secrets Manager, etc.)

**Example with environment variable:**
```bash
# Set password as environment variable
export ADMIN_PASSWORD=$(openssl rand -base64 32)

# Use in command
docker exec -it <container> \
  sh -c "node scripts/opsguard.mjs --user admin --email admin@example.com --password \"$ADMIN_PASSWORD\" --role admin"
```

### 2. Database Access

- Ensure `DATABASE_URL` uses encrypted connections (SSL/TLS)
- Use read-write database credentials (not read-only)
- Restrict database access to authorized personnel only
- Use connection pooling for production databases

### 3. Network Security

- Execute CLI commands over secure connections (SSH, VPN)
- Use encrypted channels for database connections
- Implement network policies in Kubernetes

### 4. Audit Logging

Consider logging CLI executions for audit purposes:

```bash
# Log command execution
echo "$(date): Created user admin@example.com" >> /var/log/opsguard-cli.log

# Execute CLI
node scripts/opsguard.mjs --user admin --email admin@example.com --password "$PASSWORD" --role admin
```

## Troubleshooting

### Error: DATABASE_URL is required

**Solution:** Ensure `DATABASE_URL` is set in environment or `.env` file:
```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL

# Or check .env file
cat .env | grep DATABASE_URL
```

### Error: User already exists

**Solution:** Use the `--update` flag to update an existing user:
```bash
opsguard --user admin --email admin@example.com --password newpassword --role admin --update
```

### Error: Invalid role

**Solution:** Use one of the valid roles: `admin`, `responder`, or `user` (case-insensitive)

### Error: Connection refused / Database connection failed

**Solution:** 
- Verify database is running and accessible
- Check network connectivity
- Verify `DATABASE_URL` format: `postgresql://user:password@host:port/database`
- Check firewall rules and security groups

### Error: Module not found

**Solution:** Ensure dependencies are installed:
```bash
npm install
# Or in Docker/Kubernetes, ensure node_modules are present
```

## Automation Examples

### Initial Setup Script

Create a setup script for initial deployment:

**`scripts/setup-admin.sh`:**
```bash
#!/bin/bash
set -e

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(openssl rand -base64 32)}"
ADMIN_NAME="${ADMIN_NAME:-Administrator}"

echo "Creating admin user: $ADMIN_EMAIL"

node scripts/opsguard.mjs \
  --user "$ADMIN_NAME" \
  --email "$ADMIN_EMAIL" \
  --password "$ADMIN_PASSWORD" \
  --role admin

echo "Admin user created successfully!"
echo "Email: $ADMIN_EMAIL"
echo "Password: $ADMIN_PASSWORD"
```

**Usage:**
```bash
chmod +x scripts/setup-admin.sh
./scripts/setup-admin.sh
```

### Kubernetes Init Container

Use an init container to create the admin user on first deployment:

**Add to `k8s/opsguard-deployment.yaml`:**
```yaml
spec:
  template:
    spec:
      initContainers:
      - name: create-admin
        image: your-registry.com/opsguard:v1.0.0
        command:
        - node
        - scripts/opsguard.mjs
        args:
        - --user
        - "Admin User"
        - --email
        - $(ADMIN_EMAIL)
        - --password
        - $(ADMIN_PASSWORD)
        - --role
        - admin
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: opsguard-secrets
              key: DATABASE_URL
        - name: ADMIN_EMAIL
          valueFrom:
            secretKeyRef:
              name: opsguard-secrets
              key: ADMIN_EMAIL
        - name: ADMIN_PASSWORD
          valueFrom:
            secretKeyRef:
              name: opsguard-secrets
              key: ADMIN_PASSWORD
      containers:
      # ... your main container
```

## Common Use Cases

### 1. Initial Production Setup

```bash
# Create the first admin user
docker exec -it opsguard-app node scripts/opsguard.mjs \
  --user "System Administrator" \
  --email admin@yourcompany.com \
  --password "$(openssl rand -base64 32)" \
  --role admin
```

### 2. Add Team Members

```bash
# Create responder users for on-call team
docker exec -it opsguard-app node scripts/opsguard.mjs \
  --user "John Doe" \
  --email john.doe@yourcompany.com \
  --password "$(openssl rand -base64 32)" \
  --role responder
```

### 3. Reset Admin Password

```bash
# Update admin password
docker exec -it opsguard-app node scripts/opsguard.mjs \
  --user "System Administrator" \
  --email admin@yourcompany.com \
  --password "NewSecurePassword123!" \
  --role admin \
  --update
```

### 4. Bulk User Creation

Create a script for bulk user creation:

**`scripts/bulk-create-users.sh`:**
```bash
#!/bin/bash

users=(
  "John Doe:john.doe@example.com:responder"
  "Jane Smith:jane.smith@example.com:admin"
  "Bob Wilson:bob.wilson@example.com:user"
)

for user_data in "${users[@]}"; do
  IFS=':' read -r name email role <<< "$user_data"
  password=$(openssl rand -base64 32)
  
  node scripts/opsguard.mjs \
    --user "$name" \
    --email "$email" \
    --password "$password" \
    --role "$role"
  
  echo "Created user: $email with password: $password"
done
```

## Additional Resources

- [Kubernetes Deployment Guide](./k8s/README.md)
- [Main Setup Instructions](./SETUP_INSTRUCTIONS.md)
- [Docker Compose Guide](./docker-compose.yml)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review application logs
3. Verify database connectivity
4. Check environment configuration

