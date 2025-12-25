import { getUserPermissions } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import NotificationHistory from '@/components/settings/NotificationHistory';

export default async function NotificationHistoryPage() {
    const permissions = await getUserPermissions();
    
    if (!permissions) {
        redirect('/login');
    }

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                        Notification Status & History
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                        View your notification delivery history, status, and track delivery metrics
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => window.location.reload()}
                        className="glass-button"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>

            <NotificationHistory />
        </div>
    );
}

