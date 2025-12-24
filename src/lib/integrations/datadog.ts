/**
 * Datadog Integration Handler
 * Transforms Datadog webhooks to standard event format
 */

export type DatadogEvent = {
    event_type?: string;
    title?: string;
    text?: string;
    alert_type?: 'error' | 'warning' | 'info' | 'success';
    date_happened?: number;
    tags?: string[];
    host?: string;
    aggregation_key?: string;
    source_type_name?: string;
    // Alert format
    alert?: {
        id?: string;
        title?: string;
        message?: string;
        status?: string;
        severity?: string;
    };
    // Monitor format
    monitor?: {
        id?: number;
        name?: string;
        status?: string;
        message?: string;
    };
};

export function transformDatadogToEvent(data: DatadogEvent): {
    event_action: 'trigger' | 'resolve';
    dedup_key: string;
    payload: {
        summary: string;
        source: string;
        severity: 'critical' | 'error' | 'warning' | 'info';
        custom_details: any;
    };
} {
    const title = data.title || data.alert?.title || data.monitor?.name || 'Datadog Alert';
    const text = data.text || data.alert?.message || data.monitor?.message || '';
    const alertType = data.alert_type || data.alert?.severity || 'warning';
    const status = data.alert?.status || data.monitor?.status || 'triggered';
    
    const isResolved = status === 'resolved' || status === 'ok' || alertType === 'success';
    const dedupKey = data.aggregation_key || 
                    (data.alert?.id ? `datadog-alert-${data.alert.id}` : 
                     data.monitor?.id ? `datadog-monitor-${data.monitor.id}` : 
                     `datadog-${Date.now()}`);

    // Map Datadog alert type to our severity
    let mappedSeverity: 'critical' | 'error' | 'warning' | 'info' = 'warning';
    if (alertType === 'error') {
        mappedSeverity = 'critical';
    } else if (alertType === 'warning') {
        mappedSeverity = 'warning';
    } else {
        mappedSeverity = 'info';
    }

    return {
        event_action: isResolved ? 'resolve' : 'trigger',
        dedup_key: dedupKey,
        payload: {
            summary: title,
            source: 'Datadog',
            severity: mappedSeverity,
            custom_details: {
                title,
                text,
                alertType,
                status,
                dateHappened: data.date_happened,
                tags: data.tags,
                host: data.host,
                sourceType: data.source_type_name,
                alert: data.alert,
                monitor: data.monitor,
                eventType: data.event_type
            }
        }
    };
}










