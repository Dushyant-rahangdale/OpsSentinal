'use client';

type Watcher = {
    id: string;
    user: { id: string; name: string; email: string };
    role: string;
};

type IncidentWatchersProps = {
    watchers: Watcher[];
    users: Array<{ id: string; name: string; email: string }>;
    canManage: boolean;
    onAddWatcher: (formData: FormData) => void;
    onRemoveWatcher: (formData: FormData) => void;
};

export default function IncidentWatchers({ 
    watchers, 
    users, 
    canManage, 
    onAddWatcher, 
    onRemoveWatcher 
}: IncidentWatchersProps) {
    return (
        <div className="glass-panel" style={{ 
            padding: '1.5rem', 
            background: canManage ? 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' : '#f9fafb', 
            border: '1px solid #e6e8ef', 
            borderRadius: '0px',
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)', 
            opacity: canManage ? 1 : 0.7 
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontWeight: '700', color: canManage ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    Stakeholders / Watchers
                </h4>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    Visibility
                </span>
            </div>

            {canManage ? (
                <>
                    <form action={onAddWatcher} style={{ display: 'grid', gap: '0.6rem', marginBottom: '1rem' }}>
                        <select
                            name="watcherId"
                            defaultValue=""
                            style={{ 
                                padding: '0.625rem', 
                                borderRadius: '0px', 
                                border: '1px solid var(--border)', 
                                background: '#fff',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            <option value="">Select a user...</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name} ({user.email})
                                </option>
                            ))}
                        </select>
                        <select
                            name="watcherRole"
                            defaultValue="FOLLOWER"
                            style={{ 
                                padding: '0.625rem', 
                                borderRadius: '0px', 
                                border: '1px solid var(--border)', 
                                background: '#fff',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            <option value="FOLLOWER">Follower</option>
                            <option value="STAKEHOLDER">Stakeholder</option>
                            <option value="EXEC">Executive</option>
                        </select>
                        <button 
                            className="glass-button" 
                            style={{ 
                                height: '36px', 
                                padding: '0 0.75rem', 
                                fontSize: '0.85rem',
                                borderRadius: '0px'
                            }}
                        >
                            Add Watcher
                        </button>
                    </form>
                </>
            ) : (
                <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        ⚠️ You don't have access to manage watchers. Responder role or above required.
                    </p>
                    <div style={{ display: 'grid', gap: '0.6rem', opacity: 0.5, pointerEvents: 'none' }}>
                        <select disabled style={{ padding: '0.625rem', borderRadius: '0px', border: '1px solid #e2e8f0', background: '#f3f4f6' }}>
                            <option value="">Select a user...</option>
                        </select>
                        <select disabled defaultValue="FOLLOWER" style={{ padding: '0.625rem', borderRadius: '0px', border: '1px solid #e2e8f0', background: '#f3f4f6' }}>
                            <option value="FOLLOWER">Follower</option>
                        </select>
                        <button className="glass-button" disabled style={{ height: '36px', padding: '0 0.75rem', fontSize: '0.85rem', opacity: 0.5, borderRadius: '0px' }}>
                            Add Watcher
                        </button>
                    </div>
                </div>
            )}

            {watchers.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    No watchers yet. Add stakeholders to keep them informed about this incident.
                </p>
            ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {watchers.map((watcher) => (
                        <div 
                            key={watcher.id} 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                gap: '0.75rem', 
                                padding: '0.875rem', 
                                border: '1px solid var(--border)', 
                                borderRadius: '0px',
                                background: '#fff',
                                transition: 'all 0.15s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: 'var(--primary)',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    flexShrink: 0
                                }}>
                                    {watcher.user.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                        {watcher.user.name}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                        {watcher.role}
                                    </div>
                                </div>
                            </div>
                            {canManage && (
                                <form action={onRemoveWatcher}>
                                    <input type="hidden" name="watcherMemberId" value={watcher.id} />
                                    <button 
                                        className="glass-button" 
                                        style={{ 
                                            height: '32px', 
                                            padding: '0 0.75rem', 
                                            fontSize: '0.8rem',
                                            borderRadius: '0px',
                                            background: '#feecec',
                                            border: '1px solid rgba(211,47,47,0.25)',
                                            color: 'var(--danger)'
                                        }}
                                    >
                                        Remove
                                    </button>
                                </form>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}









