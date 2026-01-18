---
order: 1
---

# Events API

The Events API is the primary way to trigger, acknowledge, and resolve incidents.

## Endpoint

```
POST /api/events
```

## Authentication

Requires an API key with `events:write` scope.

## Request Body

```json
{
  "routing_key": "service_routing_key",
  "event_action": "trigger",
  "dedup_key": "unique-alert-id",
  "payload": {
    "summary": "Brief description of the issue",
    "source": "monitoring-system",
    "severity": "critical",
    "custom_details": {
      "key": "value"
    }
  }
}
```

## Fields

| Field                    | Type   | Required | Description                            |
| ------------------------ | ------ | -------- | -------------------------------------- |
| `routing_key`            | string | ✅       | Service integration key                |
| `service_id`             | string | ✅\*     | Alternative to `routing_key`           |
| `event_action`           | string | ✅       | `trigger`, `acknowledge`, `resolve`    |
| `dedup_key`              | string | ✅       | Deduplication key                      |
| `payload.summary`        | string | ✅       | Alert description                      |
| `payload.source`         | string | ✅       | Alert source                           |
| `payload.severity`       | string | ✅       | `critical`, `error`, `warning`, `info` |
| `payload.custom_details` | object | -        | Additional context                     |

## Examples

### Trigger

```bash
curl -X POST https://your-ops.com/api/events \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "routing_key": "abc123",
    "event_action": "trigger",
    "dedup_key": "server-cpu-high",
    "payload": {
      "summary": "CPU usage above 90%",
      "source": "prometheus",
      "severity": "critical"
    }
  }'
```

### Acknowledge

```bash
curl -X POST https://your-ops.com/api/events \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "routing_key": "abc123",
    "event_action": "acknowledge",
    "dedup_key": "server-cpu-high"
  }'
```

### Resolve

```bash
curl -X POST https://your-ops.com/api/events \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "routing_key": "abc123",
    "event_action": "resolve",
    "dedup_key": "server-cpu-high"
  }'
```

## Response

### Success

```json
{
  "status": "success",
  "message": "Event processed",
  "dedup_key": "server-cpu-high",
  "incident_key": "inc_xyz789"
}
```

### Error

```json
{
  "error": {
    "code": "INVALID_ROUTING_KEY",
    "message": "Routing key not found"
  }
}
```

## Deduplication

- First trigger creates the incident.
- Subsequent triggers with the same `dedup_key` update the incident.
- Resolve closes the incident.

## Best Practices

- Use stable `dedup_key` values.
- Include context in `custom_details`.
- Send resolve events when issues clear.
