import prisma from '@/lib/prisma';
import { createIntegration, deleteIntegration } from '../../actions';
import HoverLink from '@/components/service/HoverLink';
import ServiceTabs from '@/components/service/ServiceTabs';
import CopyButton from '@/components/service/CopyButton';
import DeleteIntegrationButton from '@/components/service/DeleteIntegrationButton';
import { getUserPermissions } from '@/lib/rbac';

type IntegrationType = 'EVENTS_API_V2' | 'CLOUDWATCH' | 'AZURE' | 'DATADOG' | 'WEBHOOK' | 'PAGERDUTY' | 'GRAFANA' | 'PROMETHEUS' | 'NEWRELIC' | 'SENTRY' | 'OPSGENIE' | 'GITHUB';

const INTEGRATION_TYPES: Array<{ value: IntegrationType; label: string; description: string; icon: string }> = [
    {
        value: 'EVENTS_API_V2',
        label: 'Events API',
        description: 'Standard API integration using authentication tokens',
        icon: '🔑'
    },
    {
        value: 'CLOUDWATCH',
        label: 'AWS CloudWatch',
        description: 'Receive alerts from AWS CloudWatch alarms via SNS',
        icon: '☁️'
    },
    {
        value: 'AZURE',
        label: 'Azure Monitor',
        description: 'Receive alerts from Azure Monitor alert rules',
        icon: '🔷'
    },
    {
        value: 'DATADOG',
        label: 'Datadog',
        description: 'Receive alerts from Datadog monitors and events',
        icon: '📊'
    },
    {
        value: 'PAGERDUTY',
        label: 'PagerDuty',
        description: 'Receive incidents from PagerDuty webhooks',
        icon: '📞'
    },
    {
        value: 'GRAFANA',
        label: 'Grafana',
        description: 'Receive alerts from Grafana alerting rules',
        icon: '📈'
    },
    {
        value: 'PROMETHEUS',
        label: 'Prometheus Alertmanager',
        description: 'Receive alerts from Prometheus Alertmanager webhooks',
        icon: '🔥'
    },
    {
        value: 'NEWRELIC',
        label: 'New Relic',
        description: 'Receive alerts from New Relic APM and infrastructure',
        icon: '🆕'
    },
    {
        value: 'SENTRY',
        label: 'Sentry',
        description: 'Receive error events from Sentry issue tracking',
        icon: '🚨'
    },
    {
        value: 'OPSGENIE',
        label: 'Opsgenie',
        description: 'Receive alerts from Opsgenie incident management',
        icon: '⚡'
    },
    {
        value: 'GITHUB',
        label: 'GitHub/GitLab',
        description: 'Receive alerts from GitHub Actions and GitLab CI/CD pipelines',
        icon: '🐙'
    },
    {
        value: 'WEBHOOK',
        label: 'Generic Webhook',
        description: 'Custom webhook integration for any monitoring tool',
        icon: '🔗'
    }
];

function getWebhookUrl(integrationType: IntegrationType, integrationId: string): string {
    // In production, this should use the actual domain from environment variables
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'https://your-domain.com';

    switch (integrationType) {
        case 'CLOUDWATCH':
            return `${baseUrl}/api/integrations/cloudwatch?integrationId=${integrationId}`;
        case 'AZURE':
            return `${baseUrl}/api/integrations/azure?integrationId=${integrationId}`;
        case 'DATADOG':
            return `${baseUrl}/api/integrations/datadog?integrationId=${integrationId}`;
        case 'PAGERDUTY':
            return `${baseUrl}/api/integrations/pagerduty?integrationId=${integrationId}`;
        case 'GRAFANA':
            return `${baseUrl}/api/integrations/grafana?integrationId=${integrationId}`;
        case 'PROMETHEUS':
            return `${baseUrl}/api/integrations/prometheus?integrationId=${integrationId}`;
        case 'NEWRELIC':
            return `${baseUrl}/api/integrations/newrelic?integrationId=${integrationId}`;
        case 'SENTRY':
            return `${baseUrl}/api/integrations/sentry?integrationId=${integrationId}`;
        case 'OPSGENIE':
            return `${baseUrl}/api/integrations/opsgenie?integrationId=${integrationId}`;
        case 'GITHUB':
            return `${baseUrl}/api/integrations/github?integrationId=${integrationId}`;
        case 'WEBHOOK':
            return `${baseUrl}/api/integrations/webhook?integrationId=${integrationId}`;
        case 'EVENTS_API_V2':
        default:
            return `${baseUrl}/api/events`;
    }
}

export default async function ServiceIntegrationsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const [service, permissions] = await Promise.all([
        prisma.service.findUnique({
            where: { id },
            include: { integrations: { orderBy: { createdAt: 'desc' } } }
        }),
        getUserPermissions()
    ]);

    if (!service) {
        return (
            <main style={{ padding: '2rem' }}>
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                    <h2>Service Not Found</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>The service you're looking for doesn't exist.</p>
                    <HoverLink href="/services" className="glass-button primary">Back to Services</HoverLink>
                </div>
            </main>
        );
    }

    const canManageIntegrations = permissions.isAdminOrResponder;

    return (
        <main style={{ padding: '2rem 1.5rem' }}>
            {/* Header */}
            <HoverLink
                href={`/services/${id}`}
                style={{
                    marginBottom: '2rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                }}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to {service.name}
            </HoverLink>

            <div style={{
                marginBottom: '2rem',
                paddingBottom: '1.5rem',
                borderBottom: '2px solid var(--border)'
            }}>
                <div style={{ marginBottom: '1rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                        Integrations
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                        Configure alert sources to send incidents to {service.name}
                    </p>
                </div>
                <ServiceTabs serviceId={id} />
            </div>

            {/* Existing Integrations */}
            {service.integrations.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                        Active Integrations ({service.integrations.length})
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {service.integrations.map(integration => {
                            const integrationType = integration.type as IntegrationType;
                            const typeInfo = INTEGRATION_TYPES.find(t => t.value === integrationType) || INTEGRATION_TYPES[0];
                            const webhookUrl = getWebhookUrl(integrationType, integration.id);

                            return (
                                <div
                                    key={integration.id}
                                    style={{
                                        padding: '1.5rem',
                                        background: 'white',
                                        border: '1px solid var(--border)',
                                        borderRadius: '0px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                                <span style={{ fontSize: '1.5rem' }}>{typeInfo.icon}</span>
                                                <div>
                                                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                        {integration.name}
                                                    </h3>
                                                    <span style={{
                                                        fontSize: '0.8rem',
                                                        padding: '0.25rem 0.75rem',
                                                        background: '#e0f2fe',
                                                        color: '#0c4a6e',
                                                        borderRadius: '12px',
                                                        fontWeight: '500'
                                                    }}>
                                                        {typeInfo.label}
                                                    </span>
                                                </div>
                                            </div>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '2.25rem' }}>
                                                {typeInfo.description}
                                            </p>
                                        </div>
                                        {canManageIntegrations && (
                                            <DeleteIntegrationButton
                                                action={deleteIntegration.bind(null, integration.id, service.id)}
                                                integrationName={integration.name}
                                            />
                                        )}
                                    </div>

                                    {/* Integration Details */}
                                    <div style={{
                                        marginTop: '1rem',
                                        padding: '1rem',
                                        background: '#f8fafc',
                                        border: '1px solid var(--border)',
                                        borderRadius: '0px'
                                    }}>
                                        {integrationType === 'EVENTS_API_V2' ? (
                                            <>
                                                <div style={{ marginBottom: '0.75rem' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        API Key
                                                    </div>
                                                    <div style={{
                                                        fontFamily: 'monospace',
                                                        padding: '0.75rem',
                                                        background: 'white',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: '0px',
                                                        fontSize: '0.85rem',
                                                        wordBreak: 'break-all'
                                                    }}>
                                                        {integration.key}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        Usage Example
                                                    </div>
                                                    <pre style={{
                                                        background: '#1e293b',
                                                        color: '#e2e8f0',
                                                        padding: '1rem',
                                                        borderRadius: '0px',
                                                        overflowX: 'auto',
                                                        fontSize: '0.8rem',
                                                        margin: 0
                                                    }}>
                                                        {`curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Token token=${integration.key}" \\
  -d '{
    "event_action": "trigger",
    "dedup_key": "alert_123",
    "payload": {
      "summary": "High CPU Load",
      "source": "monitoring-tool",
      "severity": "critical"
    }
  }'`}
                                                    </pre>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ marginBottom: '0.75rem' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        Webhook URL
                                                    </div>
                                                    <div style={{
                                                        fontFamily: 'monospace',
                                                        padding: '0.75rem',
                                                        background: 'white',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: '0px',
                                                        fontSize: '0.85rem',
                                                        wordBreak: 'break-all',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: '0.5rem'
                                                    }}>
                                                        <span style={{ flex: 1 }}>{webhookUrl}</span>
                                                        <CopyButton text={webhookUrl} />
                                                    </div>
                                                </div>
                                                <div style={{
                                                    padding: '0.75rem',
                                                    background: '#fef3c7',
                                                    border: '1px solid #fbbf24',
                                                    borderRadius: '0px',
                                                    fontSize: '0.85rem',
                                                    color: '#92400e'
                                                }}>
                                                    <strong>Setup Instructions:</strong> Configure your {typeInfo.label} to send webhooks to the URL above.
                                                    The integration will automatically create incidents when alerts are received.
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Create New Integration */}
            {canManageIntegrations ? (
                <div style={{
                    padding: '2rem',
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: '0px'
                }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                        Add New Integration
                    </h2>
                    <form action={createIntegration} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <input type="hidden" name="serviceId" value={service.id} />

                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                                Integration Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                placeholder="e.g. Production CloudWatch, Staging Datadog"
                                required
                                className="focus-border"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: '0px',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                                Integration Type
                            </label>
                            <select
                                name="type"
                                required
                                className="focus-border"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: '0px',
                                    fontSize: '0.95rem',
                                    background: 'white',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                            >
                                {INTEGRATION_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.icon} {type.label}
                                    </option>
                                ))}
                            </select>
                            <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                                {INTEGRATION_TYPES.map(type => (
                                    <div
                                        key={type.value}
                                        style={{
                                            padding: '0.75rem',
                                            background: '#f8fafc',
                                            border: '1px solid var(--border)',
                                            borderRadius: '0px',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                                            {type.icon} {type.label}
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                            {type.description}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button
                                type="submit"
                                className="glass-button primary"
                                style={{ padding: '0.75rem 2rem', fontSize: '1rem', fontWeight: '600' }}
                            >
                                Create Integration
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div style={{
                    padding: '2rem',
                    background: '#f9fafb',
                    border: '1px solid var(--border)',
                    borderRadius: '0px',
                    textAlign: 'center'
                }}>
                    <p style={{ color: 'var(--text-muted)' }}>
                        You don't have permission to manage integrations. Admin or Responder role required.
                    </p>
                </div>
            )}
        </main>
    );
}
