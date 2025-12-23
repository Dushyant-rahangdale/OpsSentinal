import prisma from '@/lib/prisma';
import { getUserPermissions } from '@/lib/rbac';
import { createSchedule } from './actions';
import ScheduleCard from '@/components/ScheduleCard';
import ScheduleStats from '@/components/ScheduleStats';
import ScheduleCreateForm from '@/components/ScheduleCreateForm';

export default async function SchedulesPage() {
    const schedules = await prisma.onCallSchedule.findMany({
        include: {
            layers: {
                include: {
                    users: {
                        select: {
                            userId: true
                        }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    const totalLayers = schedules.reduce((sum, schedule) => sum + schedule.layers.length, 0);
    const hasActiveCoverage = schedules.some((schedule) =>
        schedule.layers.some((layer) => layer.users.length > 0)
    );

    const permissions = await getUserPermissions();
    const canManageSchedules = permissions.isAdminOrResponder;

    return (
        <main style={{ padding: '1rem' }}>
            {/* Header */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                paddingBottom: '1.5rem',
                borderBottom: '2px solid var(--border)'
            }}>
                <div>
                    <p style={{
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: 'var(--accent)',
                        marginBottom: '0.5rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        On-call
                    </p>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: 'var(--text-primary)',
                        marginBottom: '0.5rem'
                    }}>
                        Schedules
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        Design rotations, monitor coverage, and keep responders aligned.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        borderRadius: '20px',
                        background: hasActiveCoverage
                            ? 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)'
                            : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                        border: `1px solid ${hasActiveCoverage ? '#a7f3d0' : '#fecaca'}`,
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: hasActiveCoverage ? '#065f46' : '#991b1b'
                    }}>
                        <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: hasActiveCoverage ? '#10b981' : '#ef4444',
                            display: 'inline-block'
                        }} />
                        {hasActiveCoverage ? 'Rotations active' : 'No active rotations'}
                    </div>
                    {canManageSchedules ? (
                        <a
                            href="#new-schedule"
                            className="glass-button primary"
                            style={{ textDecoration: 'none' }}
                        >
                            New Schedule
                        </a>
                    ) : (
                        <button
                            type="button"
                            disabled
                            className="glass-button primary"
                            style={{ opacity: 0.6, cursor: 'not-allowed' }}
                            title="Admin or Responder role required to create schedules"
                        >
                            New Schedule
                        </button>
                    )}
                </div>
            </header>

            {/* Statistics */}
            <ScheduleStats
                scheduleCount={schedules.length}
                layerCount={totalLayers}
                hasActiveCoverage={hasActiveCoverage}
            />

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* Schedules List */}
                <div>
                    {schedules.length === 0 ? (
                        <div className="glass-panel empty-state" style={{
                            padding: '3rem',
                            textAlign: 'center',
                            color: 'var(--text-muted)',
                            background: 'white',
                            borderRadius: '12px'
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
                            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: '600' }}>No schedules yet</p>
                            <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                Create a schedule to start building your on-call coverage.
                            </p>
                            {canManageSchedules && (
                                <a href="#new-schedule" className="glass-button primary" style={{ textDecoration: 'none' }}>
                                    Create Your First Schedule
                                </a>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {schedules.map((schedule) => (
                                <ScheduleCard key={schedule.id} schedule={schedule} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <aside>
                    <ScheduleCreateForm action={createSchedule} canCreate={canManageSchedules} />
                    <div className="glass-panel" style={{
                        marginTop: '1.5rem',
                        padding: '1.5rem',
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        border: '1px solid #fde68a',
                        borderRadius: '12px'
                    }}>
                        <h4 style={{
                            fontSize: '1rem',
                            fontWeight: '600',
                            marginBottom: '0.5rem',
                            color: '#78350f'
                        }}>
                            Next up
                        </h4>
                        <p style={{
                            fontSize: '0.9rem',
                            color: '#78350f',
                            lineHeight: 1.5,
                            margin: 0
                        }}>
                            Set a rotation and assign your responders to start tracking coverage.
                        </p>
                    </div>
                </aside>
            </div>
        </main>
    );
}
