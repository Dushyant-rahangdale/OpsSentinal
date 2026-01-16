type Severity = 'critical' | 'error' | 'warning' | 'info';
type EventAction = 'trigger' | 'resolve' | 'acknowledge';

const CRITICAL_KEYS = ['critical', 'crit', 'p1', 'sev0', 'sev1', 'high', 'fatal', 'down'];
const ERROR_KEYS = ['error', 'err', 'p2', 'sev2'];
const WARNING_KEYS = ['warning', 'warn', 'p3', 'sev3', 'degraded', 'medium'];
const INFO_KEYS = ['info', 'informational', 'p4', 'p5', 'low', 'ok', 'normal'];

const RESOLVE_KEYS = ['resolve', 'resolved', 'close', 'closed', 'recover', 'recovered', 'ok', 'up'];
const ACK_KEYS = ['ack', 'acknowledge', 'acknowledged'];

export function normalizeSeverity(value?: string, fallback: Severity = 'warning'): Severity {
  if (!value) return fallback;
  const normalized = value.toLowerCase();
  if (CRITICAL_KEYS.some(key => normalized.includes(key))) return 'critical';
  if (ERROR_KEYS.some(key => normalized.includes(key))) return 'error';
  if (WARNING_KEYS.some(key => normalized.includes(key))) return 'warning';
  if (INFO_KEYS.some(key => normalized.includes(key))) return 'info';
  return fallback;
}

export function normalizeEventAction(
  value?: string,
  fallback: EventAction = 'trigger'
): EventAction {
  if (!value) return fallback;
  const normalized = value.toLowerCase();
  if (ACK_KEYS.some(key => normalized.includes(key))) return 'acknowledge';
  if (RESOLVE_KEYS.some(key => normalized.includes(key))) return 'resolve';
  return fallback;
}

export function firstString(
  ...values: Array<string | number | null | undefined>
): string | undefined {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return undefined;
}
