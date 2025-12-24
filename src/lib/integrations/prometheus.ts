/**
 * Prometheus Alertmanager Integration Handler
 * Transforms Prometheus Alertmanager webhooks to standard event format
 */

export type PrometheusAlert = {
    version: string;
    groupKey: string;
    status: 'firing' | 'resolved';
    receiver: string;
    groupLabels: Record<string, string>;
    commonLabels: Record<string, string>;
    commonAnnotations: Record<string, string>;
    externalURL: string;
    alerts: Array<{
        status: 'firing' | 'resolved';
        labels: Record<string, string>;
        annotations: Record<string, string>;
        startsAt: string;
        endsAt?: string;
        generatorURL: string;
        fingerprint: string;
    }>;
};

export function transformPrometheusToEvent(payload: PrometheusAlert): {
    event_action: 'trigger' | 'resolve';
    dedup_key: string;
    payload: {
        summary: string;
        source: string;
        severity: 'critical' | 'error' | 'warning' | 'info';
        custom_details: any;
    };
} {
    if (!payload.alerts || payload.alerts.length === 0) {
        throw new Error('Invalid Prometheus payload: empty alerts array');
    }

    // Process the first alert (or combine multiple)
    const alert = payload.alerts[0];
    const isResolved = payload.status === 'resolved' || alert.status === 'resolved' || alert.endsAt;

    const summary = alert.annotations?.summary || 
                   alert.annotations?.description || 
                   alert.labels?.alertname || 
                   'Prometheus Alert';

    // Use fingerprint as dedup key if available, otherwise use alertname
    const dedupKey = alert.fingerprint || 
                    `prometheus-${alert.labels?.alertname || Date.now()}`;

    // Determine severity from labels
    let severity: 'critical' | 'error' | 'warning' | 'info' = 'warning';
    const severityLabel = alert.labels?.severity?.toLowerCase();
    if (severityLabel === 'critical' || severityLabel === 'page') {
        severity = 'critical';
    } else if (severityLabel === 'error' || severityLabel === 'warning') {
        severity = severityLabel === 'error' ? 'error' : 'warning';
    }

    return {
        event_action: isResolved ? 'resolve' : 'trigger',
        dedup_key: dedupKey,
        payload: {
            summary,
            source: 'Prometheus Alertmanager',
            severity,
            custom_details: {
                version: payload.version,
                groupKey: payload.groupKey,
                status: payload.status,
                receiver: payload.receiver,
                groupLabels: payload.groupLabels,
                commonLabels: payload.commonLabels,
                commonAnnotations: payload.commonAnnotations,
                externalURL: payload.externalURL,
                alert: {
                    status: alert.status,
                    labels: alert.labels,
                    annotations: alert.annotations,
                    startsAt: alert.startsAt,
                    endsAt: alert.endsAt,
                    generatorURL: alert.generatorURL,
                    fingerprint: alert.fingerprint
                },
                allAlerts: payload.alerts
            }
        }
    };
}










