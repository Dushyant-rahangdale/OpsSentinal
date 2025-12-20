import prisma from '@/lib/prisma';
import { getUserPermissions } from '@/lib/rbac';
import { createSchedule } from './actions';
import Link from 'next/link';
import TimeZoneSelect from '@/components/TimeZoneSelect';

export default async function SchedulesPage() {
    const schedules = await prisma.onCallSchedule.findMany({
        include: { layers: { include: { users: true } } }
    });
    const totalLayers = schedules.reduce((sum, schedule) => sum + schedule.layers.length, 0);
    const hasActiveCoverage = schedules.some((schedule) =>
        schedule.layers.some((layer) => layer.users.length > 0)
    );
    const permissions = await getUserPermissions();
    const canManageSchedules = permissions.isAdminOrResponder;

    return (
        <main className="schedule-page">
            <section className="schedule-hero">
                <div>
                    <p className="schedule-eyebrow">On-call</p>
                    <h1>Schedules</h1>
                    <p className="schedule-subtitle">Design rotations, monitor coverage, and keep responders aligned.</p>
                </div>
                <div className="schedule-hero-actions">
                    <div className={`coverage-pill ${hasActiveCoverage ? 'on' : 'off'}`}>
                        <span className="coverage-dot" />
                        {hasActiveCoverage ? 'Rotations active' : 'No active rotations'}
                    </div>
                    {canManageSchedules ? (
                        <a href="#new-schedule" className="glass-button primary">New schedule</a>
                    ) : (
                        <button 
                            type="button" 
                            disabled 
                            className="glass-button primary" 
                            style={{ opacity: 0.6, cursor: 'not-allowed' }}
                            title="Admin or Responder role required to create schedules"
                        >
                            New schedule
                        </button>
                    )}
                </div>
            </section>

            <section className="schedule-stats">
                <div className="schedule-stat">
                    <span className="schedule-stat-label">Schedules</span>
                    <span className="schedule-stat-value">{schedules.length}</span>
                </div>
                <div className="schedule-stat">
                    <span className="schedule-stat-label">Layers</span>
                    <span className="schedule-stat-value">{totalLayers}</span>
                </div>
                <div className="schedule-stat">
                    <span className="schedule-stat-label">Coverage status</span>
                    <span className="schedule-stat-value">{hasActiveCoverage ? 'Healthy' : 'Needs setup'}</span>
                </div>
            </section>

            <div className="schedule-grid">
                <div className="schedule-list">
                    {schedules.map((schedule: any) => (
                        <Link key={schedule.id} href={`/schedules/${schedule.id}`} className="schedule-card">
                            {(() => {
                                const uniqueUsers = new Set<string>();
                                schedule.layers.forEach((layer: any) => {
                                    layer.users.forEach((user: any) => uniqueUsers.add(user.userId));
                                });
                                return (
                                    <>
                                    <div className="schedule-card-header">
                                        <h3>{schedule.name}</h3>
                                        <span className="schedule-chip">{schedule.timeZone}</span>
                                    </div>
                                    <p className="schedule-card-body">Layered rotations with overrides and handoffs.</p>
                                    <div className="schedule-card-footer">
                                        <span className="schedule-meta">{schedule.layers.length} layers</span>
                                        <span className="schedule-meta">{uniqueUsers.size} responders</span>
                                        <span className="schedule-link">View schedule -&gt;</span>
                                    </div>
                                    </>
                                );
                            })()}
                        </Link>
                    ))}
                    {schedules.length === 0 && (
                        <div className="schedule-card empty-state">
                            <h3>No schedules yet</h3>
                            <p>Create a schedule to start building your on-call coverage.</p>
                        </div>
                    )}
                </div>

                <aside className="schedule-side">
                    {canManageSchedules ? (
                        <div id="new-schedule" className="schedule-panel">
                            <h3>New schedule</h3>
                            <form action={createSchedule} className="schedule-form">
                                <label className="schedule-field">
                                    Name
                                    <input name="name" placeholder="Primary on-call" required />
                                </label>
                                <label className="schedule-field">
                                    Time zone
                                    <TimeZoneSelect name="timeZone" defaultValue="UTC" />
                                </label>
                                <button className="glass-button primary schedule-submit">Create schedule</button>
                            </form>
                        </div>
                    ) : (
                        <div id="new-schedule" className="schedule-panel" style={{ background: '#f9fafb', opacity: 0.7, pointerEvents: 'none' }}>
                            <h3 style={{ color: 'var(--text-secondary)' }}>New schedule</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--danger)', marginBottom: '1rem', fontStyle: 'italic' }}>
                                ⚠️ You don't have access to create schedules. Admin or Responder role required.
                            </p>
                            <div className="schedule-form" style={{ opacity: 0.5 }}>
                                <label className="schedule-field">
                                    Name
                                    <input name="name" placeholder="Primary on-call" disabled />
                                </label>
                                <label className="schedule-field">
                                    Time zone
                                    <TimeZoneSelect name="timeZone" defaultValue="UTC" disabled />
                                </label>
                                <button className="glass-button primary schedule-submit" disabled>Create schedule</button>
                            </div>
                        </div>
                    )}
                    <div className="schedule-panel schedule-hint">
                        <h4>Next up</h4>
                        <p>Set a rotation and assign your responders to start tracking coverage.</p>
                    </div>
                </aside>
            </div>
        </main>
    );
}
