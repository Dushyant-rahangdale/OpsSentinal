import prisma from '@/lib/prisma';
import { createIncident } from '../actions';
import Link from 'next/link';

export default async function CreateIncidentPage() {
    const services = await prisma.service.findMany({ orderBy: { name: 'asc' } });

    return (
        <main>
            <Link href="/incidents" style={{ color: 'var(--text-muted)', marginBottom: '2rem', display: 'inline-block' }}>
                &larr; Cancel
            </Link>

            <div className="glass-panel" style={{ padding: '2.5rem', maxWidth: '980px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.35rem' }}>Trigger Incident</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Capture impact, classify urgency, and route responders in one step.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <Link href="/incidents" className="glass-button" style={{ textDecoration: 'none' }}>Cancel</Link>
                        <button form="incident-create-form" type="submit" className="glass-button primary">
                            Trigger Incident
                        </button>
                    </div>
                </div>

                <form id="incident-create-form" action={createIncident} style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: '2fr 1fr' }}>
                    <section className="glass-panel" style={{ padding: '1.5rem', background: 'white' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>Incident Details</h2>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Title</label>
                                <input
                                    name="title"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: '#fff',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        color: 'inherit',
                                        outline: 'none'
                                    }}
                                    placeholder="e.g., API Latency Spike in EU region"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Description (Optional)</label>
                                <textarea
                                    name="description"
                                    rows={5}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: '#fff',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        color: 'inherit',
                                        outline: 'none',
                                        resize: 'vertical'
                                    }}
                                    placeholder="Impact summary, customer-facing symptoms, key metrics..."
                                />
                            </div>
                        </div>
                    </section>

                    <section className="glass-panel" style={{ padding: '1.5rem', background: 'white' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>Impact & Routing</h2>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Impacted Service</label>
                                <select
                                    name="serviceId"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: '#fff',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        color: 'inherit',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="">Select a service...</option>
                                    {services.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Urgency</label>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input type="radio" name="urgency" value="HIGH" defaultChecked />
                                        <span style={{ color: 'var(--danger)', fontWeight: 600 }}>High</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input type="radio" name="urgency" value="LOW" />
                                        <span style={{ color: 'var(--warning)', fontWeight: 600 }}>Low</span>
                                    </label>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Priority</label>
                                    <select
                                        name="priority"
                                        style={{
                                            width: '100%',
                                            padding: '0.7rem',
                                            border: '1px solid var(--border)',
                                            borderRadius: '10px',
                                            background: '#fff'
                                        }}
                                    >
                                        <option value="">Auto</option>
                                        <option value="P1">P1 - Critical</option>
                                        <option value="P2">P2 - High</option>
                                        <option value="P3">P3 - Medium</option>
                                        <option value="P4">P4 - Low</option>
                                        <option value="P5">P5 - Informational</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Source</label>
                                    <select
                                        name="source"
                                        style={{
                                            width: '100%',
                                            padding: '0.7rem',
                                            border: '1px solid var(--border)',
                                            borderRadius: '10px',
                                            background: '#fff'
                                        }}
                                    >
                                        <option value="manual">Manual</option>
                                        <option value="monitoring">Monitoring</option>
                                        <option value="customer">Customer Report</option>
                                        <option value="deployment">Deployment</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="glass-panel" style={{ padding: '1.5rem', background: 'white' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>Alerting & Deduplication</h2>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Dedup Key (Optional)</label>
                                <input
                                    name="dedupKey"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: '#fff',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        color: 'inherit',
                                        outline: 'none'
                                    }}
                                    placeholder="e.g., api-latency-eu"
                                />
                                <p style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Use the same key to avoid duplicate incidents from the same root cause.
                                </p>
                            </div>

                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                <label style={{ fontWeight: '500' }}>Notification Defaults</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    <input type="checkbox" name="notifyOnCall" defaultChecked />
                                    Notify on-call responders immediately
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    <input type="checkbox" name="notifySlack" defaultChecked />
                                    Post update to service channel
                                </label>
                            </div>
                        </div>
                    </section>

                    <section className="glass-panel" style={{ padding: '1.5rem', background: 'white' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>Next Steps</h2>
                        <ol style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'grid', gap: '0.5rem' }}>
                            <li>Assign incident ownership and assess customer impact.</li>
                            <li>Update status page and internal comms.</li>
                            <li>Track mitigation progress in the timeline.</li>
                        </ol>
                    </section>
                </form>
            </div>
        </main>
    );
}
