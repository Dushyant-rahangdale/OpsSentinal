import type { IncidentUrgency, Prisma } from '@prisma/client';
import { normalizeIncidentPriority, type IncidentPriority } from './priority';
import {
  defaultAlertClassification,
  priorityFromUrgency,
  type AlertSeverity,
} from './classification-contract';

export { ALERT_SEVERITIES } from './classification-contract';
export type { AlertSeverity } from './classification-contract';

export type IncidentClassification = {
  priority: IncidentPriority | null;
  urgency: IncidentUrgency;
  prioritySource: string;
  urgencySource: string;
  policyId: string | null;
  policyVersion: number | null;
  rule: string | null;
};

/**
 * Classifies only new incidents. Existing incidents retain captured SLA/classification provenance.
 *
 * v2 deliberately has one configurable classification authority: the workspace policy. Provider
 * integrations still supply normalized severity, while trusted creation paths can explicitly set
 * priority or urgency. This keeps the shipped control surface identical to the runtime contract.
 */
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

  // Unit-test transaction doubles do not always expose every generated Prisma
  // delegate. Production startup applies migrations before serving requests.
  const workspace = tx.incidentClassificationPolicy
    ? await tx.incidentClassificationPolicy.findFirst({
        where: { scopeKey: 'workspace', sealedAt: { not: null } },
        orderBy: { version: 'desc' },
        include: { rules: true },
      })
    : null;

  const severity = input.alertSeverity ?? null;
  const matchedRule = severity
    ? workspace?.rules.find(
        candidate => candidate.matchType === 'ALERT_SEVERITY' && candidate.matchValue === severity
      )
    : undefined;
  const fallback = severity ? defaultAlertClassification(severity) : null;
  const rulePriority = normalizeIncidentPriority(matchedRule?.priority);
  const ruleUrgency = matchedRule?.urgency ?? null;

  const urgency = input.explicitUrgency ?? ruleUrgency ?? fallback?.urgency ?? 'MEDIUM';
  let priority = explicitPriority ?? rulePriority ?? null;
  let prioritySource = explicitPriority
    ? 'EXPLICIT'
    : rulePriority
      ? 'CLASSIFICATION_RULE'
      : 'NONE';
  let policyApplied =
    (input.explicitUrgency == null && ruleUrgency !== null) ||
    (explicitPriority === null && rulePriority !== null);

  if (!priority && workspace?.derivePriorityFromUrgency) {
    priority = priorityFromUrgency(urgency);
    prioritySource = 'URGENCY_FALLBACK';
    policyApplied = true;
  }

  const urgencySource = input.explicitUrgency
    ? 'EXPLICIT'
    : ruleUrgency !== null
      ? 'CLASSIFICATION_RULE'
      : severity
        ? 'LEGACY_SEVERITY_DEFAULT'
        : 'DEFAULT';
  const rule = matchedRule
    ? `ALERT_SEVERITY:${severity}`
    : prioritySource === 'URGENCY_FALLBACK'
      ? 'URGENCY_FALLBACK'
      : null;

  return {
    priority,
    urgency,
    prioritySource,
    urgencySource,
    policyId: policyApplied ? (workspace?.id ?? null) : null,
    policyVersion: policyApplied ? (workspace?.version ?? null) : null,
    rule: policyApplied ? rule : null,
  };
}
