import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MobileAvatar } from '@/components/mobile/MobileUtils';
import MobileCard from '@/components/mobile/MobileCard';

export const dynamic = 'force-dynamic';

type PageProps = {
    params: Promise<{ id: string }>;
};

export default async function MobileScheduleDetailPage({ params }: PageProps) {
    const { id } = await params;

    const schedule = await prisma.onCallSchedule.findUnique({
        where: { id },
        include: {
            layers: {
                include: {
                    users: {
                        include: {
                            user: { select: { id: true, name: true, email: true } }
                        },
                        orderBy: { position: 'asc' }
                    }
                },
                orderBy: { name: 'asc' }
            },
            shifts: {
                where: {
                    start: { lte: new Date() },
                    end: { gte: new Date() }
                },
                include: {
                    user: { select: { id: true, name: true, email: true } }
                },
                take: 1
            }
        }
    });

    if (!schedule) {
        notFound();
    }

    const currentOnCall = schedule.shifts[0]?.user;
    const totalParticipants = schedule.layers.reduce(
        (acc, layer) => acc + layer.users.length, 0
    );

    return (
        <div className="mobile-dashboard">
            {/* Back Button */}
            <Link
                href="/m/schedules"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    color: 'var(--primary)',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    marginBottom: '1rem',
                }}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back to Schedules
            </Link>

            {/* Schedule Header */}
            <MobileCard padding="lg" className="mobile-incident-card">
                <div style={{ marginBottom: '0.75rem' }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
                        {schedule.name}
                    </h1>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                        📅 {schedule.layers.length} layer{schedule.layers.length !== 1 ? 's' : ''} •
                        👥 {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
                    </p>
                    {schedule.timeZone && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
                            🌍 Timezone: {schedule.timeZone}
                        </p>
                    )}
                </div>

                {/* Current On-Call */}
                {currentOnCall && (
                    <div style={{
                        padding: '0.75rem',
                        background: 'var(--badge-success-bg)',
                        borderRadius: '8px',
                        marginTop: '0.75rem'
                    }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--badge-success-text)', marginBottom: '0.375rem' }}>
                            CURRENTLY ON-CALL
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MobileAvatar name={currentOnCall.name || currentOnCall.email} size="sm" />
                            <span style={{ fontWeight: '600', color: 'var(--badge-success-text)' }}>
                                {currentOnCall.name || currentOnCall.email}
                            </span>
                        </div>
                    </div>
                )}
            </MobileCard>

            {/* Layers Section */}
            <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '700', margin: '0 0 0.75rem' }}>
                    Rotation Layers
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {schedule.layers.map((layer, index) => (
                        <MobileCard key={layer.id} padding="md">
                            <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                    {layer.name || `Layer ${index + 1}`}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                                    ⏱️ {layer.rotationLengthHours}h rotation • {layer.users.length} participants
                                </div>
                            </div>

                            {/* Layer Participants */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {layer.users.map((layerUser, userIndex) => (
                                    <div
                                        key={layerUser.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            padding: '0.5rem',
                                            background: 'var(--bg-primary)',
                                            borderRadius: '6px'
                                        }}
                                    >
                                        <span style={{
                                            fontSize: '0.7rem',
                                            fontWeight: '600',
                                            color: 'var(--text-muted)',
                                            width: '20px'
                                        }}>
                                            #{userIndex + 1}
                                        </span>
                                        <MobileAvatar name={layerUser.user.name || layerUser.user.email} size="sm" />
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                            {layerUser.user.name || layerUser.user.email}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </MobileCard>
                    ))}
                </div>
            </div>

            {/* View on Desktop Link */}
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <Link
                    href={`/schedules/${schedule.id}`}
                    style={{
                        fontSize: '0.85rem',
                        color: 'var(--primary)',
                        textDecoration: 'none'
                    }}
                >
                    View full schedule on desktop →
                </Link>
            </div>
        </div>
    );
}
