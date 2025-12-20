import prisma from '@/lib/prisma';
import { createIntegration } from '../../actions';

export default async function ServiceIntegrationsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const service = await prisma.service.findUnique({
        where: { id },
        include: { integrations: true }
    });

    if (!service) return <div>Service not found</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Integrations for {service.name}</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Manage inbound integrations and API keys.</p>
            </div>

            {/* List Existing Integrations */}
            <div className="glass-panel" style={{ background: 'white', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #eee' }}>Active Integrations</h2>

                {service.integrations.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No integrations configured.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {service.integrations.map(int => (
                            <div key={int.id} style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <strong style={{ fontSize: '1.1rem' }}>{int.name}</strong>
                                    <span style={{ fontSize: '0.8rem', background: '#e0f2f1', color: '#00796b', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{int.type}</span>
                                </div>
                                <div style={{ fontFamily: 'monospace', background: '#f5f5f5', padding: '0.75rem', borderRadius: '4px', wordBreak: 'break-all', fontSize: '0.9rem' }}>
                                    <strong style={{ color: '#666', marginRight: '0.5rem' }}>Key:</strong>
                                    {int.key}
                                </div>

                                <div style={{ marginTop: '1rem' }}>
                                    <p style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.5rem' }}>Usage Example (Curl):</p>
                                    <pre style={{ background: '#333', color: '#fff', padding: '1rem', borderRadius: '4px', overflowX: 'auto', fontSize: '0.8rem' }}>
                                        {`curl -X POST http://localhost:3000/api/events \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Token token=${int.key}" \\
  -d '{
    "event_action": "trigger",
    "dedup_key": "sample_alert_123",
    "payload": {
      "summary": "High CPU Load",
      "source": "monitoring-tool",
      "severity": "critical"
    }
  }'`}
                                    </pre>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create New Integration Form */}
            <div className="glass-panel" style={{ background: 'white' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Add New Integration</h2>
                <form action={createIntegration} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                    <input type="hidden" name="serviceId" value={service.id} />
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', fontWeight: '500' }}>Integration Name</label>
                        <input type="text" name="name" placeholder="e.g. Datadog, Prometheus" required style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '4px' }} />
                    </div>
                    <button type="submit" className="glass-button primary">Generate Key</button>
                </form>
            </div>
        </div>
    );
}
