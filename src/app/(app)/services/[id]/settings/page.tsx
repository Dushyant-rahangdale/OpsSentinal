import prisma from '@/lib/prisma';
import Link from 'next/link';
import HoverLink from '@/components/service/HoverLink';
import ServiceTabs from '@/components/service/ServiceTabs';
import ServiceNotificationSettings from '@/components/service/ServiceNotificationSettings';
import { updateService } from '../../actions';

export default async function ServiceSettingsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [service, teams, policies] = await Promise.all([
        prisma.service.findUnique({
            where: { id: id },
            include: {
                policy: {
                    select: { id: true, name: true }
                },
                slackIntegration: {
                    select: {
                        id: true,
                        workspaceName: true,
                        workspaceId: true,
                        enabled: true
                    }
                },
                webhookIntegrations: {
                    where: { enabled: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        }),
        prisma.team.findMany({ orderBy: { name: 'asc' } }),
        prisma.escalationPolicy.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        })
    ]);

    // Get webhook integrations separately (already included in service)
    const webhookIntegrations = service?.webhookIntegrations || [];

    if (!service) {
        return (
            <main style={{ padding: '2rem' }}>
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', background: 'white' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>Service Not Found</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>The service you're looking for doesn't exist.</p>
                    <Link href="/services" className="glass-button primary">Back to Services</Link>
                </div>
            </main>
        );
    }

    const updateServiceWithId = updateService.bind(null, id);

    return (
        <main style={{ padding: '1.5rem' }}>
            <HoverLink
                href={`/services/${id}`}
                style={{
                    marginBottom: '1.5rem',
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
                        Service Settings
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                        Manage your service configuration, ownership, and integrations
                    </p>
                </div>
                <ServiceTabs serviceId={id} />
            </div>

            <div className="glass-panel" style={{ padding: '2rem', background: 'white', borderRadius: '0px', border: '1px solid var(--border)' }}>

                <form action={updateServiceWithId} style={{ display: 'grid', gap: '2rem' }}>
                    {/* Basic Information Section */}
                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                            Basic Information
                        </h3>
                        <div style={{ display: 'grid', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                    Service Name <span style={{ color: 'var(--danger)' }}>*</span>
                                </label>
                                <input
                                    name="name"
                                    defaultValue={service.name}
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
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    defaultValue={service.description || ''}
                                    rows={4}
                                    placeholder="Describe what this service does and its purpose..."
                                    className="focus-border"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid var(--border)',
                                        borderRadius: '0px',
                                        resize: 'vertical',
                                        fontSize: '0.95rem',
                                        fontFamily: 'inherit',
                                        outline: 'none',
                                        transition: 'border-color 0.2s'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Ownership & Policy Section */}
                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                            Ownership & Escalation
                        </h3>
                        <div style={{ display: 'grid', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                    Owner Team
                                </label>
                                <select
                                    name="teamId"
                                    defaultValue={service.teamId || ''}
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
                                    <option value="">Unassigned</option>
                                    {teams.map((team) => (
                                        <option key={team.id} value={team.id}>{team.name}</option>
                                    ))}
                                </select>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                    The team responsible for maintaining this service
                                </p>
                            </div>

                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                    Escalation Policy
                                    <span
                                        title="Defines who gets notified when incidents occur and in what order."
                                        style={{
                                            width: '18px',
                                            height: '18px',
                                            borderRadius: '50%',
                                            background: '#e0f2fe',
                                            color: '#0c4a6e',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            cursor: 'help',
                                            border: '1px solid #bae6fd'
                                        }}
                                    >
                                        ?
                                    </span>
                                </label>
                                <select
                                    name="escalationPolicyId"
                                    defaultValue={service.escalationPolicyId || ''}
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
                                    <option value="">No escalation policy</option>
                                    {policies.map((policy) => (
                                        <option key={policy.id} value={policy.id}>{policy.name}</option>
                                    ))}
                                </select>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                    {service.policy ? (
                                        <>Current policy: <strong style={{ color: 'var(--text-primary)' }}>{service.policy.name}</strong>. <Link href="/policies" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}>Manage policies →</Link></>
                                    ) : (
                                        <>No escalation policy assigned. <Link href="/policies" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}>Create one →</Link></>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Service Notifications Section (ISOLATED) */}
                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                            Service Notifications (Isolated)
                        </h3>
                        <ServiceNotificationSettings
                            serviceId={id}
                            serviceNotificationChannels={service.serviceNotificationChannels || []}
                            slackChannel={service.slackChannel}
                            slackWebhookUrl={service.slackWebhookUrl}
                            slackIntegration={service.slackIntegration || null}
                            webhookIntegrations={webhookIntegrations}
                        />
                    </div>

                    {/* Form Actions */}
                    <div style={{
                        paddingTop: '1rem',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <Link
                            href={`/services/${id}`}
                            className="glass-button"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            className="glass-button primary"
                            style={{
                                padding: '0.75rem 2rem',
                                fontSize: '1rem',
                                fontWeight: '600'
                            }}
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}
