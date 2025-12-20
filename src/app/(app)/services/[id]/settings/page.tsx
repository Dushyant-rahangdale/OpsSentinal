import prisma from '@/lib/prisma';
import { updateService } from '../../actions';

export default async function ServiceSettingsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [service, teams] = await Promise.all([
        prisma.service.findUnique({
            where: { id: id }
        }),
        prisma.team.findMany({ orderBy: { name: 'asc' } })
    ]);

    if (!service) {
        return <div>Service not found</div>;
    }

    const updateServiceWithId = updateService.bind(null, id);

    return (
        <div className="glass-panel" style={{ padding: '2rem', background: 'white' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                Service Settings
            </h2>

            <form action={updateServiceWithId} style={{ display: 'grid', gap: '1.5rem', maxWidth: '600px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Service Name</label>
                    <input
                        name="name"
                        defaultValue={service.name}
                        required
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '4px' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Description</label>
                    <textarea
                        name="description"
                        defaultValue={service.description || ''}
                        rows={3}
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '4px', resize: 'vertical' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Owner Team</label>
                    <select
                        name="teamId"
                        defaultValue={service.teamId || ''}
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '4px' }}
                    >
                        <option value="">Unassigned</option>
                        {teams.map((team) => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <label style={{ marginBottom: '0.5rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>📢</span> Slack Integration
                    </label>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        Enter a Slack Incoming Webhook URL to receive incident notifications for this service.
                    </p>
                    <input
                        name="slackWebhookUrl"
                        defaultValue={service.slackWebhookUrl || ''}
                        placeholder="https://hooks.slack.com/services/..."
                        style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.9rem' }}
                    />
                </div>

                <div style={{ paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="glass-button primary">
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
}
