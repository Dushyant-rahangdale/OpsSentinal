import { normalizeEventAction, normalizeSeverity, firstString } from './normalization';

export type HoneycombEvent = {
  alert_id?: string;
  alert_name?: string;
  alert_severity?: string;
  event_type?: string;
  status?: string;
  trigger_reason?: string;
  result_url?: string;
  dataset?: string;
  [key: string]: unknown;
};

export function transformHoneycombToEvent(data: HoneycombEvent): {
  event_action: 'trigger' | 'resolve' | 'acknowledge';
  dedup_key: string;
  payload: {
    summary: string;
    source: string;
    severity: 'critical' | 'error' | 'warning' | 'info';
    custom_details: Record<string, unknown>;
  };
} {
  const summary = firstString(data.alert_name, data.trigger_reason) || 'Honeycomb Alert';
  const status = firstString(data.status, data.event_type);
  const severity = normalizeSeverity(data.alert_severity, 'warning');
  const dedupKey = firstString(data.alert_id) || `honeycomb-${Date.now()}`;

  return {
    event_action: normalizeEventAction(status, 'trigger'),
    dedup_key: String(dedupKey),
    payload: {
      summary,
      source: 'Honeycomb',
      severity,
      custom_details: {
        dataset: data.dataset,
        resultUrl: data.result_url,
        raw: data,
      },
    },
  };
}
