/**
 * Grafana Integration Handler
 * Transforms Grafana alert webhooks to standard event format
 */

export type GrafanaAlert = {
    title?: string;
    message?: string;
    state?: 'alerting' | 'ok' | 'no_data' | 'pending' | 'paused';
    ruleId?: number;
    ruleName?: string;
    ruleUrl?: string;
    evalMatches?: Array<{
        metric: string;
        value: number;
        tags?: Record<string, string>;
    }>;
    tags?: Record<string, string>;
    dashboardId?: number;
    panelId?: number;
    orgId?: number;
    // Legacy format
    alerts?: Array<{
        status: string;
        labels: Record<string, string>;
        annotations?: Record<string, string>;
        startsAt: string;
        endsAt?: string;
    }>;
    status?: string;
    groupLabels?: Record<string, string>;
    commonLabels?: Record<string, string>;
    commonAnnotations?: Record<string, string>;
};

export function transformGrafanaToEvent(payload: GrafanaAlert): {
    event_action: 'trigger' | 'resolve';
    dedup_key: string;
    payload: {
        summary: string;
        source: string;
        severity: 'critical' | 'error' | 'warning' | 'info';
        custom_details: any;
    };
} {
    // Handle new Grafana alert format
    if (payload.state !== undefined || payload.ruleName) {
        const isResolved = payload.state === 'ok';
        const summary = payload.title || payload.ruleName || payload.message || 'Grafana Alert';
        const dedupKey = `grafana-${payload.ruleId || Date.now()}`;

        const severity = payload.state === 'alerting' ? 'critical' : 
                        payload.state === 'no_data' ? 'warning' : 'info';

        return {
            event_action: isResolved ? 'resolve' : 'trigger',
            dedup_key: dedupKey,
            payload: {
                summary,
                source: 'Grafana',
                severity,
                custom_details: {
                    ruleId: payload.ruleId,
                    ruleName: payload.ruleName,
                    ruleUrl: payload.ruleUrl,
                    state: payload.state,
                    message: payload.message,
                    evalMatches: payload.evalMatches,
                    tags: payload.tags,
                    dashboardId: payload.dashboardId,
                    panelId: payload.panelId
                }
            }
        };
    }

    // Handle Prometheus Alertmanager format (Grafana can send this)
    if (payload.alerts && Array.isArray(payload.alerts)) {
        const alert = payload.alerts[0];
        if (!alert) {
            throw new Error('Invalid Grafana payload: empty alerts array');
        }

        const isResolved = alert.status === 'resolved' || alert.endsAt;
        const summary = alert.annotations?.summary || 
                       alert.annotations?.description || 
                       alert.labels?.alertname || 
                       'Grafana Alert';

        const dedupKey = `grafana-${alert.labels?.alertname || Date.now()}`;

        return {
            event_action: isResolved ? 'resolve' : 'trigger',
            dedup_key: dedupKey,
            payload: {
                summary,
                source: 'Grafana',
                severity: 'critical',
                custom_details: {
                    status: payload.status,
                    labels: alert.labels,
                    annotations: alert.annotations,
                    startsAt: alert.startsAt,
                    endsAt: alert.endsAt,
                    groupLabels: payload.groupLabels,
                    commonLabels: payload.commonLabels,
                    commonAnnotations: payload.commonAnnotations
                }
            }
        };
    }

    throw new Error('Invalid Grafana payload: unknown format');
}








