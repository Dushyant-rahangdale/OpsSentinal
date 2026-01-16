import { normalizeSeverity, firstString } from './normalization';

export type UptimeKumaEvent = {
  heartbeat?: {
    status?: number;
    msg?: string;
    monitorID?: number;
  };
  monitor?: {
    id?: number;
    name?: string;
    url?: string;
  };
  status?: string;
  msg?: string;
  [key: string]: unknown;
};

function mapAction(status?: number, statusText?: string): 'trigger' | 'resolve' {
  if (typeof status === 'number') {
    return status === 1 ? 'resolve' : 'trigger';
  }
  const normalized = statusText?.toLowerCase();
  if (normalized && (normalized.includes('up') || normalized.includes('resolved'))) {
    return 'resolve';
  }
  return 'trigger';
}

export function transformUptimeKumaToEvent(data: UptimeKumaEvent): {
  event_action: 'trigger' | 'resolve';
  dedup_key: string;
  payload: {
    summary: string;
    source: string;
    severity: 'critical' | 'error' | 'warning' | 'info';
    custom_details: Record<string, unknown>;
  };
} {
  const summary =
    firstString(data.monitor?.name, data.msg, data.heartbeat?.msg) || 'Uptime Kuma Alert';
  const action = mapAction(data.heartbeat?.status, data.status);
  const severity =
    action === 'resolve' ? normalizeSeverity('info', 'info') : normalizeSeverity('critical');
  const dedupKey =
    firstString(data.heartbeat?.monitorID, data.monitor?.id) || `uptime-kuma-${Date.now()}`;

  return {
    event_action: action,
    dedup_key: String(dedupKey),
    payload: {
      summary,
      source: 'Uptime Kuma',
      severity,
      custom_details: {
        heartbeat: data.heartbeat,
        monitor: data.monitor,
        raw: data,
      },
    },
  };
}
