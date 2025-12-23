/**
 * PagerDuty Integration Handler
 * Transforms PagerDuty webhook events to standard event format
 */

export type PagerDutyEvent = {
    event?: {
        event_type: 'incident.triggered' | 'incident.acknowledged' | 'incident.resolved' | 'incident.escalated';
        incident?: {
            id: string;
            incident_number: number;
            title: string;
            description?: string;
            status: 'triggered' | 'acknowledged' | 'resolved';
            urgency: 'high' | 'low';
            created_at: string;
            service?: {
                id: string;
                name: string;
            };
        };
    };
    // Legacy format
    messages?: Array<{
        event: string;
        incident?: {
            incident_key: string;
            incident_number: number;
            created_on: string;
            status: string;
            html_url: string;
            service: {
                name: string;
            };
            trigger_summary_data?: {
                subject?: string;
                description?: string;
            };
        };
    }>;
};

export function transformPagerDutyToEvent(payload: PagerDutyEvent): {
    event_action: 'trigger' | 'resolve' | 'acknowledge';
    dedup_key: string;
    payload: {
        summary: string;
        source: string;
        severity: 'critical' | 'error' | 'warning' | 'info';
        custom_details: any;
    };
} {
    // Handle new webhook format
    if (payload.event) {
        const incident = payload.event.incident;
        if (!incident) {
            throw new Error('Invalid PagerDuty payload: missing incident');
        }

        const eventType = payload.event.event_type;
        let eventAction: 'trigger' | 'resolve' | 'acknowledge' = 'trigger';
        
        if (eventType === 'incident.resolved') {
            eventAction = 'resolve';
        } else if (eventType === 'incident.acknowledged') {
            eventAction = 'acknowledge';
        }

        const severity = incident.urgency === 'high' ? 'critical' : 'warning';

        return {
            event_action: eventAction,
            dedup_key: `pagerduty-${incident.id}`,
            payload: {
                summary: incident.title,
                source: `PagerDuty${incident.service ? ` - ${incident.service.name}` : ''}`,
                severity,
                custom_details: {
                    incident_id: incident.id,
                    incident_number: incident.incident_number,
                    description: incident.description,
                    status: incident.status,
                    urgency: incident.urgency,
                    created_at: incident.created_at,
                    service: incident.service
                }
            }
        };
    }

    // Handle legacy format
    if (payload.messages && payload.messages.length > 0) {
        const message = payload.messages[0];
        const incident = message.incident;
        
        if (!incident) {
            throw new Error('Invalid PagerDuty payload: missing incident');
        }

        const eventType = message.event;
        let eventAction: 'trigger' | 'resolve' | 'acknowledge' = 'trigger';
        
        if (eventType.includes('resolve') || incident.status === 'resolved') {
            eventAction = 'resolve';
        } else if (eventType.includes('acknowledge') || incident.status === 'acknowledged') {
            eventAction = 'acknowledge';
        }

        const summary = incident.trigger_summary_data?.subject || 
                       incident.trigger_summary_data?.description || 
                       incident.service.name || 
                       'PagerDuty Alert';

        return {
            event_action: eventAction,
            dedup_key: `pagerduty-${incident.incident_key || incident.incident_number}`,
            payload: {
                summary,
                source: `PagerDuty - ${incident.service.name}`,
                severity: 'critical',
                custom_details: {
                    incident_key: incident.incident_key,
                    incident_number: incident.incident_number,
                    status: incident.status,
                    created_on: incident.created_on,
                    html_url: incident.html_url,
                    service: incident.service,
                    trigger_summary_data: incident.trigger_summary_data
                }
            }
        };
    }

    throw new Error('Invalid PagerDuty payload: unknown format');
}








