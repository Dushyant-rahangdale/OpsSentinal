import { normalizeEventAction, normalizeSeverity, firstString } from './normalization';

export type DynatraceEvent = {
  ProblemID?: string | number;
  ProblemTitle?: string;
  ProblemDetailsText?: string;
  State?: string;
  SeverityLevel?: string;
  ProblemImpact?: string;
  ProblemURL?: string;
  [key: string]: unknown;
};

export function transformDynatraceToEvent(data: DynatraceEvent): {
  event_action: 'trigger' | 'resolve' | 'acknowledge';
  dedup_key: string;
  payload: {
    summary: string;
    source: string;
    severity: 'critical' | 'error' | 'warning' | 'info';
    custom_details: Record<string, unknown>;
  };
} {
  const summary = firstString(data.ProblemTitle, data.ProblemDetailsText) || 'Dynatrace Problem';
  const status = firstString(data.State);
  const severity = normalizeSeverity(
    firstString(data.SeverityLevel, data.ProblemImpact),
    'warning'
  );
  const dedupKey = firstString(data.ProblemID) || `dynatrace-${Date.now()}`;

  return {
    event_action: normalizeEventAction(status, 'trigger'),
    dedup_key: String(dedupKey),
    payload: {
      summary,
      source: 'Dynatrace',
      severity,
      custom_details: {
        problemId: data.ProblemID,
        problemUrl: data.ProblemURL,
        raw: data,
      },
    },
  };
}
