import prisma from '@/lib/prisma';
import Link from 'next/link';
import HoverLink from '@/components/service/HoverLink';
import ServiceTabs from '@/components/service/ServiceTabs';
import DeleteWebhookButton from '@/components/service/DeleteWebhookButton';
import { updateWebhookIntegration, deleteWebhookIntegration } from '../../actions';
import { notFound } from 'next/navigation';

export default async function EditWebhookPage({
    params
}: {
    params: Promise<{ id: string; webhookId: string }>
}) {
    const { id, webhookId } = await params;

    const [service, webhook] = await Promise.all([
        prisma.service.findUnique({
            where: { id },
            select: { id: true, name: true }
        }),
        prisma.webhookIntegration.findUnique({
            where: { id: webhookId }
        })
    ]);

    if (!service || !webhook || webhook.serviceId !== id) {
        notFound();
    }

    const updateWebhookWithIds = updateWebhookIntegration.bind(null, webhookId, id);
    const deleteWebhookWithIds = deleteWebhookIntegration.bind(null, webhookId, id);

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
                        Edit Webhook Integration
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                        Update webhook configuration for {service.name}
                    </p>
                </div>
                <ServiceTabs serviceId={id} />
            </div>

            <div className="glass-panel" style={{ padding: '2rem', background: 'white', borderRadius: '0px', border: '1px solid var(--border)' }}>
                <form action={updateWebhookWithIds} style={{ display: 'grid', gap: '2rem' }}>
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
                                    defaultValue={webhook.name}
                                    required
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
                                    defaultValue={webhook.type}
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
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                    Webhook URL <span style={{ color: 'var(--danger)' }}>*</span>
                                </label>
                                <input
                                    name="url"
                                    type="url"
                                    defaultValue={webhook.url}
                                    required
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
                                    defaultValue={webhook.secret || ''}
                                    placeholder="Leave empty to keep current secret"
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
                                    Channel/Room Name (Optional)
                                </label>
                                <input
                                    name="channel"
                                    defaultValue={webhook.channel || ''}
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
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.9rem',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="checkbox"
                                        name="enabled"
                                        value="true"
                                        defaultChecked={webhook.enabled}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    Enabled
                                </label>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                    Disabled webhooks will not send notifications
                                </p>
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
                        <DeleteWebhookButton
                            deleteAction={deleteWebhookWithIds}
                            redirectTo={`/services/${id}/settings`}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                                Save Changes
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </main>
    );
}



