# Integrations

Connect OpsSentinal with your existing tools and workflows.

## In This Section

| Integration                       | Description         |
| --------------------------------- | ------------------- |
| [Slack](./slack.md)               | Team notifications  |
| [Webhooks](./webhooks.md)         | Custom integrations |
| [Monitoring Tools](./monitoring/) | Alert sources       |

## Supported Integrations

### Communication

- **Slack** - Incident notifications to channels

### Monitoring & Alerting

- Datadog
- Prometheus/Alertmanager
- Grafana
- Sentry
- NewRelic
- AWS CloudWatch
- Azure Monitor
- GitHub Actions
- Google Cloud Monitoring
- Splunk On-Call
- Splunk Observability
- Dynatrace
- AppDynamics
- Elastic
- Honeycomb
- Bitbucket Pipelines
- UptimeRobot
- Pingdom
- Better Uptime
- Uptime Kuma

### Custom

- **Webhooks** - Send events to any HTTP endpoint
- **API** - Build custom integrations

## How Integrations Work

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Monitoring │────▶│ OpsSentinal │────▶│    Slack    │
│    Tool     │     │   (Events)  │     │  (Notify)   │
└─────────────┘     └─────────────┘     └─────────────┘
```

1. Monitoring tools send alerts to OpsSentinal Events API
2. OpsSentinal creates/updates incidents
3. Notifications sent via configured channels

## Quick Links

- [Events API](../api/events.md) - Receive alerts
- [Slack Setup](./slack.md) - Team notifications
- [Webhook Configuration](./webhooks.md) - Custom integrations
