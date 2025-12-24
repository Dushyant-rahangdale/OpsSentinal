# OpsGuard CLI - Quick Reference

## Installation

The CLI is included in the OpsGuard package. No separate installation needed.

## Basic Usage

```bash
opsguard --user <name> --email <email> --password <password> [--role <role>] [--update]
```

## Common Commands

### Create Admin User
```bash
npm run opsguard -- --user "Admin" --email admin@example.com --password SecurePass123! --role admin
```

### Create Responder User
```bash
npm run opsguard -- --user "John Doe" --email john@example.com --password SecurePass123! --role responder
```

### Update User Password
```bash
npm run opsguard -- --user "Admin" --email admin@example.com --password NewPassword123! --role admin --update
```

## Docker Usage

```bash
docker exec -it <container-name> node scripts/opsguard.mjs \
  --user admin --email admin@example.com --password SecurePass123! --role admin
```

## Kubernetes Usage

```bash
POD_NAME=$(kubectl get pod -n opsguard -l app=opsguard-app -o jsonpath='{.items[0].metadata.name}')

kubectl exec -it -n opsguard $POD_NAME -- \
  node scripts/opsguard.mjs \
  --user admin --email admin@example.com --password SecurePass123! --role admin
```

## Options

| Option | Required | Description |
|--------|----------|-------------|
| `--user` | Yes | User's display name |
| `--email` | Yes | User's email address |
| `--password` | Yes | User's password |
| `--role` | No | Role: `admin`, `responder`, or `user` (default: `user`) |
| `--update` | No | Update existing user instead of creating |
| `--help` | No | Show help message |

## Roles

- **`admin`** - Full administrative access
- **`responder`** - Can manage incidents and respond to alerts
- **`user`** - Standard user with read access (default)

## Environment

Requires `DATABASE_URL` environment variable:
- Automatically loads from `.env` file if not set
- Format: `postgresql://user:password@host:port/database`

## Help

```bash
npm run opsguard -- --help
# or
node scripts/opsguard.mjs --help
```

## Full Documentation

For complete production usage guide, see [CLI_PRODUCTION_GUIDE.md](./CLI_PRODUCTION_GUIDE.md)

