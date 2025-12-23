/**
 * Opsgenie Integration Handler
 * Transforms Opsgenie webhook events to standard event format
 */

export type OpsgenieEvent = {
    action?: 'Create' | 'Close' | 'Acknowledge' | 'AddNote' | 'Assign';
    alert?: {
        alertId: string;
        alias?: string;
        message: string;
        description?: string;
        status: 'open' | 'closed' | 'acknowledged';
        acknowledged: boolean;
        isSeen: boolean;
        tags?: string[];
        createdAt: number;
        updatedAt: number;
        source?: string;
        priority?: 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
        owner?: string;
        teams?: Array<{ id: string; name: string }>;
    };
};

export function transformOpsgenieToEvent(payload: OpsgenieEvent): {
    event_action: 'trigger' | 'resolve' | 'acknowledge';
    dedup_key: string;
    payload: {
        summary: string;
        source: string;
        severity: 'critical' | 'error' | 'warning' | 'info';
        custom_details: any;
    };
} {
    if (!payload.alert) {
        throw new Error('Invalid Opsgenie payload: missing alert');
    }

    const alert = payload.alert;
    const action = payload.action || 'Create';

    let eventAction: 'trigger' | 'resolve' | 'acknowledge' = 'trigger';
    if (action === 'Close' || alert.status === 'closed') {
        eventAction = 'resolve';
    } else if (action === 'Acknowledge' || alert.status === 'acknowledged' || alert.acknowledged) {
        eventAction = 'acknowledge';
    }

    // Map priority to severity
    const priorityMap: Record<string, 'critical' | 'error' | 'warning' | 'info'> = {
        'P1': 'critical',
        'P2': 'error',
        'P3': 'warning',
        'P4': 'info',
        'P5': 'info'
    };
    const severity = priorityMap[alert.priority || 'P3'] || 'warning';

    return {
        event_action: eventAction,
        dedup_key: `opsgenie-${alert.alias || alert.alertId}`,
        payload: {
            summary: alert.message,
            source: `Opsgenie${alert.source ? ` - ${alert.source}` : ''}`,
            severity,
            custom_details: {
                action,
                alert: {
                    alertId: alert.alertId,
                    alias: alert.alias,
                    message: alert.message,
                    description: alert.description,
                    status: alert.status,
                    acknowledged: alert.acknowledged,
                    isSeen: alert.isSeen,
                    tags: alert.tags,
                    createdAt: alert.createdAt,
                    updatedAt: alert.updatedAt,
                    source: alert.source,
                    priority: alert.priority,
                    owner: alert.owner,
                    teams: alert.teams
                }
            }
        }
    };
}








