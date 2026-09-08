import type { IncidentUrgency, Prisma } from '@prisma/client';
import { normalizeIncidentPriority, type IncidentPriority } from './priority';

export const ALERT_SEVERITIES = ['critical', 'error', 'warning', 'info'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export type IncidentClassification = {
  priority: IncidentPriority | null;
  urgency: IncidentUrgency;
  prioritySource: string;
  urgencySource: string;
  policyId: string | null;
  policyVersion: number | null;
  rule: string | null;
};

function legacySeverityDefault(severity: AlertSeverity): {
  priority: IncidentPriority;
  urgency: IncidentUrgency;
} {
  switch (severity) {
    case 'critical':
      return { priority: 'P1', urgency: 'HIGH' };
    case 'error':
      return { priority: 'P2', urgency: 'MEDIUM' };
    case 'warning':
      return { priority: 'P3', urgency: 'MEDIUM' };
    case 'info':
      return { priority: 'P5', urgency: 'LOW' };
  }
}

function priorityFromUrgency(urgency: IncidentUrgency): IncidentPriority {
  switch (urgency) {
    case 'HIGH':
      return 'P1';
    case 'MEDIUM':
      return 'P3';
    case 'LOW':
      return 'P5';
  }
}

function scopeOrder(input: { serviceId: string; integrationId?: string | null }): string[] {
  return [
    ...(input.integrationId ? [`integration:${input.integrationId}`] : []),
    `service:${input.serviceId}`,
    'workspace',
  ];
}

/** Classifies only new incidents. Existing incidents retain captured SLA/classification provenance. */
export async function resolveIncidentClassification(
  tx: Prisma.TransactionClient,
  input: {
    serviceId: string;
    integrationId?: string | null;
    explicitPriority?: string | null;
    explicitUrgency?: IncidentUrgency | null;
    alertSeverity?: AlertSeverity | null;
  }
): Promise<IncidentClassification> {
  const explicitPriority = normalizeIncidentPriority(input.explicitPriority);
  const scopes = scopeOrder(input);
  // During a rolling deploy an old database can briefly lack the additive table.
  // Preserve the pre-v2 mapping until the migration lands; new schemas always use policy data.
  const policies = tx.incidentClassificationPolicy
    ? await tx.incidentClassificationPolicy.findMany({
        where: { scopeKey: { in: scopes }, sealedAt: { not: null } },
        orderBy: { version: 'desc' },
        distinct: ['scopeKey'],
        include: { rules: true },
      })
    : [];
  const byScope = new Map(policies.map(policy => [policy.scopeKey, policy]));
  const severity = input.alertSeverity ?? null;
  const matched = severity
    ? scopes
        .map(scope => byScope.get(scope))
        .filter(Boolean)
        .map(policy => ({
          policy: policy!,
          rule: policy!.rules.find(
            candidate =>
              candidate.matchType === 'ALERT_SEVERITY' && candidate.matchValue === severity
          ),
        }))
        .find(candidate => candidate.rule)
    : undefined;
  const workspace = byScope.get('workspace');
  const fallback = severity ? legacySeverityDefault(severity) : null;
  const urgency = input.explicitUrgency ?? matched?.rule?.urgency ?? fallback?.urgency ?? 'MEDIUM';
  let priority =
    explicitPriority ??
    normalizeIncidentPriority(matched?.rule?.priority) ??
    fallback?.priority ??
    null;
  let prioritySource = explicitPriority
    ? 'EXPLICIT'
    : matched?.rule?.priority
      ? 'CLASSIFICATION_RULE'
      : fallback
        ? 'LEGACY_SEVERITY_DEFAULT'
        : 'NONE';
  if (!priority && workspace?.derivePriorityFromUrgency) {
    priority = priorityFromUrgency(urgency);
    prioritySource = 'URGENCY_FALLBACK';
  }

  return {
    priority,
    urgency,
    prioritySource,
    urgencySource: input.explicitUrgency
      ? 'EXPLICIT'
      : matched
        ? 'CLASSIFICATION_RULE'
        : severity
          ? 'LEGACY_SEVERITY_DEFAULT'
          : 'DEFAULT',
    policyId: matched?.policy.id ?? workspace?.id ?? null,
    policyVersion: matched?.policy.version ?? workspace?.version ?? null,
    rule: matched?.rule ? `ALERT_SEVERITY:${severity}` : null,
  };
}
