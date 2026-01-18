---
order: 4
---

# Monitoring Tool Integrations

Connect your monitoring tools to OpsKnight.

## Supported Tools

| Tool                          | Status       |
| ----------------------------- | ------------ |
| [Datadog](./datadog.md)       | ✅ Supported |
| [Prometheus](./prometheus.md) | ✅ Supported |
| [Grafana](./grafana.md)       | ✅ Supported |
| [Sentry](./sentry.md)         | ✅ Supported |
| AWS CloudWatch                | ✅ Supported |
| Azure Monitor                 | ✅ Supported |
| Google Cloud Monitoring       | ✅ Supported |
| Splunk On-Call                | ✅ Supported |
| Splunk Observability          | ✅ Supported |
| Dynatrace                     | ✅ Supported |
| AppDynamics                   | ✅ Supported |
| Elastic                       | ✅ Supported |
| Honeycomb                     | ✅ Supported |
| Bitbucket Pipelines           | ✅ Supported |
| UptimeRobot                   | ✅ Supported |
| Pingdom                       | ✅ Supported |
| Better Uptime                 | ✅ Supported |
| Uptime Kuma                   | ✅ Supported |

## How It Works

All monitoring tools use the OpsKnight Events API:

```
Monitoring Tool → HTTP POST → /api/events → Incident
```

## Common Setup Pattern

1. Create an Integration in OpsKnight
2. Copy the Routing Key
3. Configure your monitoring tool to send webhooks
4. Map fields to OpsKnight format

## Event Format

OpsKnight accepts events in this format:

```json
{
  "routing_key": "YOUR_ROUTING_KEY",
  "event_action": "trigger",
  "dedup_key": "unique-alert-id",
  "payload": {
    "summary": "Alert description",
    "source": "monitoring-tool",
    "severity": "critical",
    "custom_details": {
      "metric": "cpu_usage",
      "value": 95.5
    }
  }
}
```

## Severity Mapping

| Your Tool     | OpsKnight  |
| ------------- | ---------- |
| Critical / P1 | `critical` |
| Error / P2    | `error`    |
| Warning / P3  | `warning`  |
| Info / P4     | `info`     |

## Next Steps

Choose your monitoring tool:

- [Datadog](./datadog.md)
- [Prometheus/Alertmanager](./prometheus.md)
- [Grafana](./grafana.md)
- [Sentry](./sentry.md)
