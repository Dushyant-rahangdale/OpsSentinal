---
order: 5
---

# API Reference

Developer documentation for the OpsKnight REST API.

## In This Section

| Endpoint                        | Description                             |
| ------------------------------- | --------------------------------------- |
| [Events API](./events.md)       | Trigger, acknowledge, resolve incidents |
| [Incidents API](./incidents.md) | List and manage incidents               |
| [Services API](./services.md)   | List services                           |
| [Schedules API](./schedules.md) | List schedules                          |
| [CLI Tool](./cli.md)            | Command-line interface                  |

## Authentication

All API requests require authentication.

### API Key Authentication

Create an API key in **Settings → API Keys**.

Include in requests:

```bash
# Bearer token
Authorization: Bearer YOUR_API_KEY

# Or API-Key header
Authorization: Api-Key YOUR_API_KEY

# Or X-API-Key header
X-API-Key: YOUR_API_KEY
```

### Scopes

API keys have scoped permissions:

| Scope             | Description             |
| ----------------- | ----------------------- |
| `events:write`    | Send events             |
| `incidents:read`  | Read incidents          |
| `incidents:write` | Create/update incidents |
| `services:read`   | Read services           |
| `schedules:read`  | Read schedules          |

## Base URL

```
https://your-opsknight.com
```

## Rate Limits

| Endpoint   | Limit   |
| ---------- | ------- |
| Events API | 100/min |
| Other APIs | 300/min |

Rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705318800
```

## Error Responses

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid API key"
  }
}
```

| Code             | HTTP Status | Description              |
| ---------------- | ----------- | ------------------------ |
| `UNAUTHORIZED`   | 401         | Invalid/missing auth     |
| `FORBIDDEN`      | 403         | Insufficient permissions |
| `NOT_FOUND`      | 404         | Resource not found       |
| `RATE_LIMITED`   | 429         | Too many requests        |
| `INTERNAL_ERROR` | 500         | Server error             |
