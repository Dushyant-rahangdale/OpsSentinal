---
order: 3
---

# Webhooks

Send incident events to external systems.

## What are Webhooks?

Webhooks are HTTP callbacks that notify external systems when events occur in OpsKnight.

## Creating a Webhook

1. Go to **Settings → Integrations**
2. Click **+ Add Webhook**
3. Configure:

| Field  | Description                |
| ------ | -------------------------- |
| Name   | Friendly name              |
| URL    | Endpoint to receive events |
| Secret | HMAC signing secret        |
| Events | Which events to send       |

## Event Types

| Event                   | Description           |
| ----------------------- | --------------------- |
| `incident.triggered`    | New incident created  |
| `incident.acknowledged` | Incident acknowledged |
| `incident.resolved`     | Incident resolved     |
| `incident.escalated`    | Escalation triggered  |
| `incident.reopened`     | Incident reopened     |

## Payload Format

```json
{
  "event": "incident.triggered",
  "timestamp": "2024-01-15T10:30:00Z",
  "incident": {
    "id": "inc_abc123",
    "title": "Database connection timeout",
    "status": "triggered",
    "severity": "critical",
    "service": {
      "id": "svc_xyz789",
      "name": "API Gateway"
    },
    "assignee": null,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

## Security

### HMAC Signature

Webhooks are signed with HMAC-SHA256:

```
X-OpsKnight-Signature: sha256=abc123...
```

### Verifying Signatures

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return signature === expected;
}
```

## Retry Policy

Failed webhooks are retried:

- 3 retry attempts
- Exponential backoff
- 1 min, 5 min, 15 min

## Testing Webhooks

1. Go to the webhook settings
2. Click **Send Test**
3. Verify receipt at your endpoint

### Using webhook.site

For testing:

1. Go to webhook.site
2. Copy the unique URL
3. Use as webhook endpoint
4. View received payloads

## Use Cases

### ITSM Integration

Send incidents to ServiceNow/Jira:

- Create tickets automatically
- Sync status updates
- Link incident to ticket

### Custom Dashboard

Push incidents to custom systems:

- Real-time displays
- Alerting integrations
- Analytics pipelines

### ChatOps

Send to chat platforms:

- Microsoft Teams
- Google Chat
- Discord
- Telegram
- Custom bots

## Best Practices

- ✅ Always verify signatures
- ✅ Handle retries gracefully
- ✅ Return 2xx quickly
- ✅ Process async if needed
- ✅ Monitor webhook delivery
