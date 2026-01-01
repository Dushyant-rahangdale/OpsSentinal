import prisma from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function MobileSchedulesPage() {
    const schedules = await prisma.onCallSchedule.findMany({
        orderBy: { name: 'asc' },
        include: {
            layers: {
                include: {
                    users: {
                        include: {
                            user: { select: { id: true, name: true, email: true } },
                        },
                    },
                },
            },
        },
    });

    return (
        <div className="mobile-dashboard">
            {/* Header */}
            <div style={{ marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>On-Call Schedules</h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                    {schedules.length} schedule{schedules.length !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Schedule List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {schedules.length === 0 ? (
                    <EmptyState />
                ) : (
                    schedules.map((schedule) => {
                        const totalParticipants = schedule.layers.reduce(
                            (acc, layer) => acc + layer.users.length,
                            0
                        );

                        return (
                            <Link
                                key={schedule.id}
                                href={`/m/schedules/${schedule.id}`}
                                className="mobile-incident-card"
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                                            {schedule.name}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            <span>📅 {schedule.layers.length} layer{schedule.layers.length !== 1 ? 's' : ''}</span>
                                            <span>•</span>
                                            <span>👥 {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                                            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
        }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: 'var(--text-primary)' }}>No schedules</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Use desktop to create on-call schedules
            </p>
        </div>
    );
}
