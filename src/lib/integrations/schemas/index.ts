/**
 * Zod Schemas for Integration Payloads
 *
 * Provides runtime validation for all webhook payloads.
 * Ensures data integrity before processing.
 */

import { z } from 'zod';

// ============================================
// Common Types
// ============================================

export const SeveritySchema = z.enum(['critical', 'error', 'warning', 'info']);

export const EventActionSchema = z.enum(['trigger', 'resolve', 'acknowledge']);

export const StandardEventSchema = z.object({
  event_action: EventActionSchema,
  dedup_key: z.string().min(1),
  payload: z.object({
    summary: z.string().min(1),
    source: z.string().min(1),
    severity: SeveritySchema,
    custom_details: z.unknown().optional(),
  }),
});

export type StandardEvent = z.infer<typeof StandardEventSchema>;

// ============================================
// AWS CloudWatch
// ============================================

export const CloudWatchAlarmSchema = z.object({
  AlarmName: z.string(),
  AlarmDescription: z.string().optional(),
  NewStateValue: z.enum(['OK', 'ALARM', 'INSUFFICIENT_DATA']),
  NewStateReason: z.string(),
  StateChangeTime: z.string(),
  Region: z.string(),
  Trigger: z
    .object({
      MetricName: z.string().optional(),
      Namespace: z.string().optional(),
      Statistic: z.string().optional(),
      Threshold: z.number().optional(),
    })
    .optional(),
});

// SNS wrapper for CloudWatch
export const SNSNotificationSchema = z.object({
  Type: z.literal('Notification'),
  Message: z.string(),
  MessageId: z.string().optional(),
  TopicArn: z.string().optional(),
  Timestamp: z.string().optional(),
});

export type CloudWatchAlarmMessage = z.infer<typeof CloudWatchAlarmSchema>;

// ============================================
// Azure Monitor
// ============================================

export const AzureAlertSchema = z.object({
  schemaId: z.string().optional(),
  data: z
    .object({
      essentials: z
        .object({
          alertId: z.string().optional(),
          alertRule: z.string().optional(),
          severity: z.string().optional(),
          signalType: z.string().optional(),
          monitorCondition: z.string().optional(),
          monitorService: z.string().optional(),
          firedDateTime: z.string().optional(),
          description: z.string().optional(),
        })
        .optional(),
      alertContext: z.unknown().optional(),
      context: z
        .object({
          id: z.string().optional(),
          name: z.string().optional(),
          description: z.string().optional(),
          conditionType: z.string().optional(),
          condition: z
            .object({
              windowSize: z.string().optional(),
              allOf: z
                .array(
                  z.object({
                    metricName: z.string().optional(),
                    threshold: z.number().optional(),
                  })
                )
                .optional(),
            })
            .optional(),
        })
        .optional(),
      properties: z.unknown().optional(),
    })
    .optional(),
});

export type AzureAlertData = z.infer<typeof AzureAlertSchema>;

// ============================================
// Datadog
// ============================================

export const DatadogEventSchema = z.object({
  event_type: z.string().optional(),
  title: z.string().optional(),
  text: z.string().optional(),
  alert_type: z.enum(['error', 'warning', 'info', 'success']).optional(),
  date_happened: z.number().optional(),
  tags: z.array(z.string()).optional(),
  host: z.string().optional(),
  aggregation_key: z.string().optional(),
  source_type_name: z.string().optional(),
  alert: z
    .object({
      id: z.string().optional(),
      title: z.string().optional(),
      message: z.string().optional(),
      status: z.string().optional(),
      severity: z.string().optional(),
    })
    .optional(),
  monitor: z
    .object({
      id: z.number().optional(),
      name: z.string().optional(),
      status: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
});

export type DatadogEvent = z.infer<typeof DatadogEventSchema>;

// ============================================
// GitHub / GitLab
// ============================================

export const GitHubEventSchema = z.object({
  action: z.string().optional(),
  repository: z
    .object({
      name: z.string(),
      full_name: z.string(),
      html_url: z.string(),
    })
    .optional(),
  workflow_run: z
    .object({
      id: z.number(),
      name: z.string(),
      status: z.enum(['queued', 'in_progress', 'completed', 'requested']),
      conclusion: z.enum(['success', 'failure', 'cancelled', 'timed_out']).nullable().optional(),
      html_url: z.string(),
    })
    .optional(),
  check_run: z
    .object({
      id: z.number(),
      name: z.string(),
      status: z.enum(['queued', 'in_progress', 'completed']),
      conclusion: z.enum(['success', 'failure', 'cancelled', 'timed_out']).nullable().optional(),
      html_url: z.string(),
    })
    .optional(),
  deployment: z
    .object({
      id: z.number(),
      environment: z.string(),
      state: z.enum(['pending', 'success', 'failure', 'error']),
    })
    .optional(),
  // GitLab format
  object_kind: z.string().optional(),
  project: z
    .object({
      name: z.string(),
      path_with_namespace: z.string(),
      web_url: z.string(),
    })
    .optional(),
  build_status: z.string().optional(),
  status: z.string().optional(),
  ref: z.string().optional(),
  commit: z
    .object({
      message: z.string(),
    })
    .optional(),
});

export type GitHubEvent = z.infer<typeof GitHubEventSchema>;

// ============================================
// Grafana
// ============================================

export const GrafanaAlertSchema = z.object({
  title: z.string().optional(),
  message: z.string().optional(),
  state: z.enum(['alerting', 'ok', 'no_data', 'pending', 'paused']).optional(),
  ruleId: z.number().optional(),
  ruleName: z.string().optional(),
  ruleUrl: z.string().optional(),
  evalMatches: z
    .array(
      z.object({
        metric: z.string(),
        value: z.number(),
        tags: z.record(z.string()).optional(),
      })
    )
    .optional(),
  tags: z.record(z.string()).optional(),
  dashboardId: z.number().optional(),
  panelId: z.number().optional(),
  orgId: z.number().optional(),
  // Alertmanager format
  alerts: z
    .array(
      z.object({
        status: z.string(),
        labels: z.record(z.string()),
        annotations: z.record(z.string()).optional(),
        startsAt: z.string(),
        endsAt: z.string().optional(),
      })
    )
    .optional(),
  status: z.string().optional(),
  groupLabels: z.record(z.string()).optional(),
  commonLabels: z.record(z.string()).optional(),
  commonAnnotations: z.record(z.string()).optional(),
});

export type GrafanaAlert = z.infer<typeof GrafanaAlertSchema>;

// ============================================
// Prometheus Alertmanager
// ============================================

export const PrometheusAlertSchema = z.object({
  version: z.string(),
  groupKey: z.string(),
  status: z.enum(['firing', 'resolved']),
  receiver: z.string(),
  groupLabels: z.record(z.string()),
  commonLabels: z.record(z.string()),
  commonAnnotations: z.record(z.string()),
  externalURL: z.string(),
  alerts: z
    .array(
      z.object({
        status: z.enum(['firing', 'resolved']),
        labels: z.record(z.string()),
        annotations: z.record(z.string()),
        startsAt: z.string(),
        endsAt: z.string().optional(),
        generatorURL: z.string(),
        fingerprint: z.string(),
      })
    )
    .min(1),
});

export type PrometheusAlert = z.infer<typeof PrometheusAlertSchema>;

// ============================================
// New Relic
// ============================================

export const NewRelicEventSchema = z.object({
  account_id: z.number().optional(),
  account_name: z.string().optional(),
  event_type: z.string().optional(),
  incident: z
    .object({
      id: z.string(),
      title: z.string(),
      state: z.enum(['open', 'acknowledged', 'resolved']),
      severity: z.enum(['critical', 'warning', 'info']),
      created_at: z.string(),
      updated_at: z.string(),
      condition_name: z.string().optional(),
      condition_id: z.number().optional(),
      policy_name: z.string().optional(),
      policy_id: z.number().optional(),
    })
    .optional(),
  alert: z
    .object({
      id: z.string(),
      alert_policy_name: z.string(),
      alert_condition_name: z.string(),
      severity: z.string(),
      timestamp: z.number(),
      state: z.enum(['open', 'closed']),
      message: z.string().optional(),
    })
    .optional(),
  alertType: z.string().optional(),
  alertSeverity: z.string().optional(),
  alertTitle: z.string().optional(),
  alertMessage: z.string().optional(),
  alertTimestamp: z.number().optional(),
});

export type NewRelicEvent = z.infer<typeof NewRelicEventSchema>;

// ============================================
// Opsgenie
// ============================================

export const OpsgenieEventSchema = z.object({
  action: z.enum(['Create', 'Close', 'Acknowledge', 'AddNote', 'Assign']).optional(),
  alert: z.object({
    alertId: z.string(),
    alias: z.string().optional(),
    message: z.string(),
    description: z.string().optional(),
    status: z.enum(['open', 'closed', 'acknowledged']),
    acknowledged: z.boolean(),
    isSeen: z.boolean(),
    tags: z.array(z.string()).optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
    source: z.string().optional(),
    priority: z.enum(['P1', 'P2', 'P3', 'P4', 'P5']).optional(),
    owner: z.string().optional(),
    teams: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
        })
      )
      .optional(),
  }),
});

export type OpsgenieEvent = z.infer<typeof OpsgenieEventSchema>;

// ============================================
// PagerDuty
// ============================================

export const PagerDutyEventSchema = z.object({
  event: z
    .object({
      event_type: z.enum([
        'incident.triggered',
        'incident.acknowledged',
        'incident.resolved',
        'incident.escalated',
      ]),
      incident: z
        .object({
          id: z.string(),
          incident_number: z.number(),
          title: z.string(),
          description: z.string().optional(),
          status: z.enum(['triggered', 'acknowledged', 'resolved']),
          urgency: z.enum(['high', 'low']),
          created_at: z.string(),
          service: z
            .object({
              id: z.string(),
              name: z.string(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
  messages: z
    .array(
      z.object({
        event: z.string(),
        incident: z
          .object({
            incident_key: z.string(),
            incident_number: z.number(),
            created_on: z.string(),
            status: z.string(),
            html_url: z.string(),
            service: z.object({
              name: z.string(),
            }),
            trigger_summary_data: z
              .object({
                subject: z.string().optional(),
                description: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
      })
    )
    .optional(),
});

export type PagerDutyEvent = z.infer<typeof PagerDutyEventSchema>;

// ============================================
// Sentry
// ============================================

export const SentryEventSchema = z.object({
  action: z.enum(['created', 'resolved', 'assigned', 'unassigned', 'ignored']).optional(),
  issue: z
    .object({
      id: z.string(),
      shortId: z.string(),
      title: z.string(),
      culprit: z.string(),
      level: z.enum(['fatal', 'error', 'warning', 'info', 'debug']),
      status: z.enum(['unresolved', 'resolved', 'ignored']),
      assignedTo: z
        .object({
          name: z.string(),
          email: z.string(),
        })
        .optional(),
      metadata: z
        .object({
          type: z.string().optional(),
          value: z.string().optional(),
        })
        .optional(),
      permalink: z.string(),
    })
    .optional(),
  event: z
    .object({
      event_id: z.string(),
      message: z.string().optional(),
      level: z.string(),
      timestamp: z.number(),
      platform: z.string(),
      tags: z.record(z.string()).optional(),
      contexts: z.record(z.unknown()).optional(),
    })
    .optional(),
  project: z
    .object({
      name: z.string(),
      slug: z.string(),
    })
    .optional(),
});

export type SentryEvent = z.infer<typeof SentryEventSchema>;

// ============================================
// Generic Webhook
// ============================================

export const GenericWebhookSchema = z
  .object({
    // Standard fields (optional for flexibility)
    summary: z.string().optional(),
    title: z.string().optional(),
    message: z.string().optional(),
    name: z.string().optional(),

    severity: z.string().optional(),
    level: z.string().optional(),
    priority: z.string().optional(),

    status: z.string().optional(),
    action: z.string().optional(),
    state: z.string().optional(),

    id: z.union([z.string(), z.number()]).optional(),
    alert_id: z.string().optional(),
    dedup_key: z.string().optional(),

    source: z.string().optional(),
    origin: z.string().optional(),
    system: z.string().optional(),
  })
  .passthrough(); // Allow additional unknown fields

export type GenericWebhookPayload = z.infer<typeof GenericWebhookSchema>;

// ============================================
// Schema Validation Helper
// ============================================

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Array<{ path: string; message: string }> };

/**
 * Validate a payload against a schema and return structured result
 */
export function validatePayload<T>(schema: z.ZodSchema<T>, payload: unknown): ValidationResult<T> {
  const result = schema.safeParse(payload);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message,
  }));

  return { success: false, errors };
}

// ============================================
// Export schemas by integration type
// ============================================

export const IntegrationSchemas = {
  CLOUDWATCH: CloudWatchAlarmSchema,
  AZURE: AzureAlertSchema,
  DATADOG: DatadogEventSchema,
  GITHUB: GitHubEventSchema,
  GRAFANA: GrafanaAlertSchema,
  PROMETHEUS: PrometheusAlertSchema,
  NEWRELIC: NewRelicEventSchema,
  OPSGENIE: OpsgenieEventSchema,
  PAGERDUTY: PagerDutyEventSchema,
  SENTRY: SentryEventSchema,
  WEBHOOK: GenericWebhookSchema,
} as const;

export type IntegrationSchemaType = keyof typeof IntegrationSchemas;
