---
order: 4
---

# Audit Logs

Track security-relevant events across your OpsKnight workspace.

## Overview

Audit logs record:

- Authentication events
- Configuration changes
- Sensitive operations
- Access patterns

## Accessing Audit Logs

1. Go to **Insights → Audit Logs** (Admin only)
2. View event timeline
3. Filter by criteria

## Logged Events

### Authentication

| Event             | Description              |
| ----------------- | ------------------------ |
| `login.success`   | User logged in           |
| `login.failure`   | Failed login attempt     |
| `logout`          | User logged out          |
| `session.revoked` | Session manually revoked |

### User Management

| Event               | Description           |
| ------------------- | --------------------- |
| `user.created`      | New user added        |
| `user.updated`      | User profile changed  |
| `user.deactivated`  | User account disabled |
| `user.role_changed` | Role updated          |

### Configuration

| Event                 | Description             |
| --------------------- | ----------------------- |
| `settings.updated`    | System settings changed |
| `integration.created` | New integration added   |
| `integration.deleted` | Integration removed     |
| `oidc.configured`     | SSO settings changed    |

### Data Access

| Event               | Description               |
| ------------------- | ------------------------- |
| `incident.viewed`   | Incident details accessed |
| `export.downloaded` | Data export created       |
| `api_key.created`   | New API key generated     |

## Event Details

Each event includes:

| Field      | Description              |
| ---------- | ------------------------ |
| Timestamp  | When it occurred         |
| Actor      | Who performed the action |
| Action     | What was done            |
| Target     | What was affected        |
| IP Address | Origin IP                |
| User Agent | Client details           |

## Filtering

Filter audit logs by:

- Date range
- Actor (user)
- Action type
- Target

## Exporting Logs

For compliance reporting:

1. Apply filters
2. Click **Export**
3. Download CSV

## Retention

Audit logs have extended retention:

- Default: 365 days
- Configurable in Data Retention settings
- Not subject to standard cleanup

## Best Practices

- Review logs regularly.
- Investigate failed logins.
- Monitor configuration changes.
- Export logs for compliance needs.
