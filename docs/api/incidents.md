---
order: 2
---

# Incidents API

Manage incidents programmatically.

## List Incidents

```
GET /api/incidents
```

**Scope:** `incidents:read`

### Query Parameters

| Parameter   | Type   | Default | Description           |
| ----------- | ------ | ------- | --------------------- |
| `limit`     | number | 50      | Max results (max 200) |
| `status`    | string | -       | Filter by status      |
| `serviceId` | string | -       | Filter by service     |

### Example

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-ops.com/api/incidents?limit=25&status=triggered"
```

### Response

```json
{
  "incidents": [
    {
      "id": "inc_abc123",
      "title": "Database timeout",
      "status": "triggered",
      "urgency": "HIGH",
      "service": {
        "id": "svc_xyz",
        "name": "API Gateway"
      },
      "assignee": null,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

## Get an Incident

```
GET /api/incidents/:id
```

**Scope:** `incidents:read`

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-ops.com/api/incidents/inc_abc123"
```

## Create an Incident

```
POST /api/incidents
```

**Scope:** `incidents:write`

```json
{
  "title": "Manual incident",
  "serviceId": "svc_xyz",
  "description": "Details about the incident",
  "urgency": "HIGH",
  "priority": "P1"
}
```

## Update an Incident

```
PATCH /api/incidents/:id
```

**Scope:** `incidents:write`

```json
{
  "status": "ACKNOWLEDGED",
  "assigneeId": "user_123"
}
```

### Updatable Fields

| Field        | Values                                        |
| ------------ | --------------------------------------------- |
| `status`     | `OPEN`, `ACKNOWLEDGED`, `RESOLVED`, `SNOOZED` |
| `urgency`    | `HIGH`, `LOW`                                 |
| `assigneeId` | User ID or empty to unassign                  |

## Best Practices

- Use the Events API for alert-driven incidents.
- Use the Incidents API for manual workflows.
