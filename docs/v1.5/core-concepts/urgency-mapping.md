---
title: Urgency and severity mapping
description: Understand how provider severity becomes incident urgency and how urgency differs from priority and notification channels.
order: 14
---

# Urgency and severity mapping

Inbound integrations normalize provider-specific alert fields into the Events API's four severity values. Event processing then applies the workspace Incident Response Policy to determine incident urgency. By default, severity does **not** assign P1–P5 priority; automatic priority is an explicit administrator opt-in.

## Canonical default mapping

| Event severity | Automatic priority | Incident urgency | Intended meaning                              |
| -------------- | ------------------ | ---------------- | --------------------------------------------- |
| `critical`     | None               | **High**         | Immediate, severe operational impact.         |
| `error`        | None               | **Medium**       | Significant fault requiring response.         |
| `warning`      | None               | **Medium**       | Degradation or risk requiring attention.      |
| `info`         | None               | **Low**          | Informational, recovery, or low-impact event. |

Unknown severity cannot pass the published Events API schema. Integration adapters commonly normalize an unrecognized provider value to `warning`, which then becomes Medium urgency under the default workspace policy; the exact adapter fallback is provider-specific.

Administrators can change the workspace severity mapping at **Settings → Incident Response Policy**. Each severity always has an urgency mapping and can optionally assign a P1–P5 priority. The optional urgency-to-priority fallback (`HIGH → P1`, `MEDIUM → P3`, `LOW → P5`) is disabled by default.

Urgency does not automatically choose SMS, push, Slack, or email. Delivery is determined by escalation-step data, user preferences, service notification selections, provider configuration, and recipient data. Some provider implementations format High urgency differently, but do not treat urgency alone as a channel-routing policy.

## Urgency, priority, and service health

- **Urgency** is High, Medium, or Low and is derived from normalized provider severity unless a trusted creation path or the workspace policy overrides it.
- **Priority** is an optional P1–P5 business-impact/response-obligation classification. It is not inferred from severity unless the administrator explicitly configures that behavior.
- Service health treats active High-urgency incidents as critical in its calculated status.
- Priority-specific SLA targets can take precedence over service or workspace fallback targets when priority exists.

Keep these classifications separate unless your operating model deliberately couples them. For example, a noisy technical alert may be High urgency but still require human priority review, while a broad customer-impact issue may be explicitly classified at a higher business priority than its source signal alone would justify.

## Common provider mappings

All resulting severity values pass through the workspace Incident Response Policy.

### AWS CloudWatch

| CloudWatch input                                     | Normalized severity         |
| ---------------------------------------------------- | --------------------------- |
| `OK`                                                 | `info` and a resolve action |
| `INSUFFICIENT_DATA`                                  | `warning`                   |
| `ALARM` description contains `CRITICAL` or `HIGH`    | `critical`                  |
| Description contains `WARNING`, `MEDIUM`, or `ERROR` | `error`                     |
| Description contains `INFO` or `LOW`                 | `info`                      |
| Other `ALARM`                                        | `critical`                  |

### Azure Monitor

| Azure input                          | Normalized severity |
| ------------------------------------ | ------------------- |
| `Sev0` or text containing `critical` | `critical`          |
| `Sev1` or text containing `error`    | `error`             |
| `Sev2` or text containing `warning`  | `warning`           |
| `Sev3`, `Sev4`, `info`, or `verbose` | `info`              |

`Fired` and `Activated` trigger; other monitor conditions resolve the matching incident.

### Datadog

| Datadog alert type | Normalized severity |
| ------------------ | ------------------- |
| `critical`         | `critical`          |
| `error`            | `error`             |
| `warning`          | `warning`           |
| Other              | `info`              |

`resolved`, `ok`, and `success` states resolve rather than trigger.

### Prometheus Alertmanager

| `severity` label         | Normalized severity |
| ------------------------ | ------------------- |
| `critical` or `page`     | `critical`          |
| `error`                  | `error`             |
| `warning`                | `warning`           |
| Missing or another value | `warning`           |

A resolved alert produces `info` and resolves its deduplication key.

### Sentry

| Sentry level      | Normalized severity |
| ----------------- | ------------------- |
| `fatal`           | `critical`          |
| `error`           | `error`              |
| `warning`         | `warning`            |
| `info` or `debug` | `info`               |

Resolved events resolve; ignored, assigned, or unassigned actions acknowledge; created, reopened, or triggered actions trigger.

### Uptime integrations

Pingdom down states, UptimeRobot outage alerts, and Uptime Kuma down states normalize to `critical`; their recovery/up states normalize to `info` and resolve. Consult the provider guide for the exact payload fields and stable deduplication key.

## Generic Events API payload

Supply one of the four lowercase severity values:

```json
{
  "event_action": "trigger",
  "dedup_key": "database/high-cpu",
  "payload": {
    "summary": "Database CPU above 90%",
    "source": "capacity-monitor",
    "severity": "critical",
    "custom_details": {
      "region": "us-east-1"
    }
  }
}
```

Reuse the same `dedup_key` for acknowledge and resolve actions. See the [Events API](../api/events.md) for authentication, schema, limits, and responses.

## Validate a mapping

1. Send a representative test payload through the service integration.
2. Confirm action, service, title, normalized severity, urgency, priority, and deduplication behavior.
3. Acknowledge or resolve using the same provider identity/key.
4. Confirm the existing incident changes state instead of creating a duplicate.
5. Test the provider's unknown/default severity and recovery payload.
6. If automatic priority is enabled, confirm the captured SLA policy/rule and priority-at-capture match the configured response policy.

## Troubleshooting

### Warning becomes Medium, not Low

This is the default workspace mapping. Change it in Incident Response Policy only when your operating model requires different notification urgency.

### Critical severity does not become P1

This is intentional by default. Severity controls urgency; priority remains unassigned until the workspace Incident Response Policy explicitly maps that severity to a P1–P5 value or enables urgency-to-priority fallback.

### A resolved alert creates or leaves an open incident

Compare the trigger and recovery deduplication keys and service integration keys. Resolution can only find an incident within the same service and matching key.

### The wrong notification channel is used

Inspect the policy step, user's preferences/contact data, service notification settings, and workspace provider. Severity-to-urgency mapping does not select a delivery channel by itself.

## Related topics

- [Incident Response Policy](../administration/incident-response-policy.md)
- [Events API](../api/events.md)
- [Incident management](incidents.md)
- [Escalation policies](escalation-policies.md)
- [Integration directory](../integrations/README.md)
