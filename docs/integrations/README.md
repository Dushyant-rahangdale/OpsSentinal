---
order: 4
---

# Integrations

Connect OpsKnight with your existing tools and workflows.

## In This Section

| Integration                                 | Description         |
| ------------------------------------------- | ------------------- |
| [Slack](./slack.md)                         | Team notifications  |
| [Slack OAuth Setup](./slack-oauth-setup.md) | OAuth configuration |
| [Webhooks](./webhooks.md)                   | Custom integrations |
| [Monitoring Tools](./monitoring/)           | Alert sources       |

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
│  Monitoring │────▶│ OpsKnight │────▶│    Slack    │
│    Tool     │     │   (Events)  │     │  (Notify)   │
└─────────────┘     └─────────────┘     └─────────────┘
```

1. Monitoring tools send alerts to OpsKnight Events API
2. OpsKnight creates/updates incidents
3. Notifications sent via configured channels

## Quick Links

- [Events API](../api/events.md) - Receive alerts
- [Slack Setup](./slack.md) - Team notifications
- [Slack OAuth Setup](./slack-oauth-setup.md) - OAuth configuration
- [Webhook Configuration](./webhooks.md) - Custom integrations
