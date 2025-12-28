import prisma from '@/lib/prisma';
import Link from 'next/link';
import HoverLink from '@/components/service/HoverLink';
import ServiceTabs from '@/components/service/ServiceTabs';
import { createWebhookIntegration } from '../actions';

export default async function NewWebhookPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const service = await prisma.service.findUnique({
        where: { id },
        select: { id: true, name: true }
    });

    if (!service) {
        return (
            <main style={{ padding: '2rem' }}>
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', background: 'white' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>Service Not Found</h2>
                    <Link href="/services" className="glass-button primary">Back to Services</Link>
                </div>
            </main>
        );
    }

    const createWebhookWithId = createWebhookIntegration.bind(null, id);

    return (
        <main style={{ padding: '1.5rem' }}>
            <HoverLink
                href={`/services/${id}/settings`}
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
                Back to {service.name} Settings
            </HoverLink>

            <div style={{
                marginBottom: '2rem',
                paddingBottom: '1.5rem',
                borderBottom: '2px solid var(--border)'
            }}>
                <div style={{ marginBottom: '1rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                        Add Webhook Integration
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                        Configure a webhook integration for {service.name}
                    </p>
                </div>
                <ServiceTabs serviceId={id} />
            </div>

            <div className="glass-panel" style={{ padding: '2rem', background: 'white', borderRadius: '0px', border: '1px solid var(--border)' }}>
                <form action={createWebhookWithId} style={{ display: 'grid', gap: '2rem' }}>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                            Webhook Configuration
                        </h3>
                        <div style={{ display: 'grid', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                    Name <span style={{ color: 'var(--danger)' }}>*</span>
                                </label>
                                <input
                                    name="name"
                                    required
                                    placeholder="e.g., Google Chat, Microsoft Teams"
                                    className="focus-border"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid var(--border)',
                                        borderRadius: '0px',
                                        fontSize: '0.95rem',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                    Type <span style={{ color: 'var(--danger)' }}>*</span>
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
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="GENERIC">Generic Webhook</option>
                                    <option value="GOOGLE_CHAT">Google Chat</option>
                                    <option value="TEAMS">Microsoft Teams</option>
                                    <option value="SLACK">Slack</option>
                                    <option value="DISCORD">Discord</option>
                                </select>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                    Select the webhook service type for proper formatting
                                </p>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                    Webhook URL <span style={{ color: 'var(--danger)' }}>*</span>
                                </label>
                                <input
                                    name="url"
                                    type="url"
                                    required
                                    placeholder="https://..."
                                    className="focus-border"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid var(--border)',
                                        borderRadius: '0px',
                                        fontFamily: 'monospace',
                                        fontSize: '0.85rem',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                    Secret (Optional)
                                </label>
                                <input
                                    name="secret"
                                    type="password"
                                    placeholder="HMAC secret for signature verification"
                                    className="focus-border"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid var(--border)',
                                        borderRadius: '0px',
                                        fontSize: '0.95rem',
                                        outline: 'none'
                                    }}
                                />
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                    Optional: Secret for HMAC signature verification
                                </p>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                    Channel/Room Name (Optional)
                                </label>
                                <input
                                    name="channel"
                                    placeholder="e.g., #incidents, General"
                                    className="focus-border"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid var(--border)',
                                        borderRadius: '0px',
                                        fontSize: '0.95rem',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{
                        paddingTop: '1rem',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <Link
                            href={`/services/${id}/settings`}
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
                            Create Webhook
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}



