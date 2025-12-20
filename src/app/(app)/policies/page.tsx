import prisma from '@/lib/prisma';
import { getUserPermissions } from '@/lib/rbac';
import { createPolicy } from './actions';
import Link from 'next/link';

export default async function PoliciesPage() {
    const policies = await prisma.escalationPolicy.findMany({
        include: {
            steps: { include: { targetUser: true }, orderBy: { stepOrder: 'asc' } },
            services: true
        }
    });

    const users = await prisma.user.findMany();
    const permissions = await getUserPermissions();
    const canCreatePolicy = permissions.isAdmin;

    return (
        <main>
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }} className="text-gradient">Escalation Policies</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Define who gets paged when incident strikes.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>

                {/* List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {policies.map((policy: any) => (
                        <div key={policy.id} className="glass-panel" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <h3 style={{ fontWeight: '600', fontSize: '1.2rem' }}>{policy.name}</h3>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{policy.services.length} Services</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {policy.steps.map((step: any, idx: number) => (
                                    <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.9rem' }}>
                                        <div style={{
                                            width: '24px', height: '24px',
                                            borderRadius: '50%', background: 'var(--primary)', color: '#fff',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                                        }}>
                                            {idx + 1}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            Notify <strong>{step.targetUser.name}</strong>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                            After {step.delayMinutes}m
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Create Form */}
                {canCreatePolicy ? (
                    <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
                        <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: 'var(--accent)' }}>New Policy</h3>
                        <form action={createPolicy} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input name="name" placeholder="Policy Name" required style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'white' }} />

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Step 1: Immediately notify</label>
                            <select name="rule-0-user" required style={{ width: '100%', padding: '0.5rem', marginTop: '0.2rem', background: '#222', color: 'white', border: '1px solid var(--border)' }}>
                                {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                            <input type="hidden" name="rule-0-delay" value="0" />
                        </div>

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Step 2: If no ack, notify</label>
                            <select name="rule-1-user" style={{ width: '100%', padding: '0.5rem', marginTop: '0.2rem', background: '#222', color: 'white', border: '1px solid var(--border)' }}>
                                <option value="">(None)</option>
                                {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                            <input name="rule-1-delay" type="number" placeholder="Delay (min)" defaultValue="15" style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem', background: '#222', color: 'white', border: '1px solid var(--border)' }} />
                        </div>

                            <button className="glass-button" style={{ marginTop: '1rem', background: 'var(--primary)' }}>Create Policy</button>
                        </form>
                    </div>
                ) : (
                    <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content', background: '#f9fafb', border: '1px solid #e5e7eb', opacity: 0.7 }}>
                        <h3 style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>New Policy</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            ⚠️ You don't have access to create policies. Admin role required.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', opacity: 0.5, pointerEvents: 'none' }}>
                            <input name="name" placeholder="Policy Name" disabled style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: '#f3f4f6', color: 'var(--text-secondary)' }} />
                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Step 1: Immediately notify</label>
                                <select name="rule-0-user" disabled style={{ width: '100%', padding: '0.5rem', marginTop: '0.2rem', background: '#f3f4f6', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                                    <option value="">Select user</option>
                                </select>
                            </div>
                            <button className="glass-button" disabled style={{ marginTop: '1rem', opacity: 0.5 }}>Create Policy</button>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
