---
order: 2
---

# Prometheus/Alertmanager Integration

Send Prometheus alerts to OpsKnight via Alertmanager.

## Setup

### Step 1: Create Integration in OpsKnight

1. Go to your Service
2. Click **Integrations → Add Integration**
3. Copy the **Routing Key**

### Step 2: Configure Alertmanager

Add OpsKnight as a receiver in `alertmanager.yml`:

```yaml
receivers:
  - name: 'opsknight'
    webhook_configs:
      - url: 'https://your-ops.com/api/events'
        send_resolved: true
        http_config:
          basic_auth:
            username: 'api'
            password: 'YOUR_API_KEY'

route:
  receiver: 'opsknight'
  routes:
    - match:
        severity: critical
      receiver: 'opsknight'
```

### Step 3: Configure Payload

For custom payload mapping, use a template:

```yaml
templates:
  - '/etc/alertmanager/templates/*.tmpl'
```

Template file:

```
{{ define "opsknight.payload" }}
{
  "routing_key": "YOUR_ROUTING_KEY",
  "event_action": "{{ if eq .Status "firing" }}trigger{{ else }}resolve{{ end }}",
  "dedup_key": "{{ .GroupKey }}",
  "payload": {
    "summary": "{{ .CommonAnnotations.summary }}",
    "source": "prometheus",
    "severity": "{{ .CommonLabels.severity }}",
    "custom_details": {
      "alertname": "{{ .CommonLabels.alertname }}",
      "description": "{{ .CommonAnnotations.description }}"
    }
  }
}
{{ end }}
```

## Severity Mapping

| Prometheus Label | OpsKnight  |
| ---------------- | ---------- |
| `critical`       | `critical` |
| `warning`        | `warning`  |
| `info`           | `info`     |

## Testing

1. Trigger a test alert:
   ```bash
   # Manually fire an alert
   curl -X POST http://alertmanager:9093/api/v1/alerts \
     -d '[{"labels":{"alertname":"TestAlert","severity":"warning"}}]'
   ```
2. Verify incident in OpsKnight
3. Resolve the alert
4. Verify incident resolves

## Troubleshooting

### Alerts not appearing

- Check Alertmanager logs
- Verify webhook URL is accessible
- Test with curl directly
