import prisma from '@/lib/prisma';
import Link from 'next/link';
import MobileCard from '@/components/mobile/MobileCard';
import { MobileAvatar } from '@/components/mobile/MobileUtils';

export const dynamic = 'force-dynamic';

export default async function MobilePostmortemsPage() {
    const postmortems = await prisma.postmortem.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            incident: {
                select: {
                    title: true,
                    service: { select: { name: true } }
                }
            },
            createdBy: { select: { name: true, email: true } },
        },
        take: 20
    });

    return (
        <div className="mobile-dashboard">
            <h1 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>Postmortems</h1>

            {postmortems.length === 0 ? (
                <div style={{
                    padding: '3rem 2rem',
                    textAlign: 'center',
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>No postmortems</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Postmortems are created from resolved incidents
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {postmortems.map((pm) => (
                        <Link
                            key={pm.id}
                            href={`/m/postmortems/${pm.id}`}
                            style={{ textDecoration: 'none' }}
                        >
                            <MobileCard className="mobile-incident-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{
                                                fontSize: '0.65rem',
                                                fontWeight: '700',
                                                textTransform: 'uppercase',
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '4px',
                                                background: pm.status === 'PUBLISHED' ? 'var(--badge-success-bg)' : 'var(--badge-neutral-bg)',
                                                color: pm.status === 'PUBLISHED' ? 'var(--badge-success-text)' : 'var(--badge-neutral-text)'
                                            }}>
                                                {pm.status}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {new Date(pm.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>

                                        <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                            {pm.incident.title}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            <span>{pm.incident.service.name}</span>
                                            <span>•</span>
                                            <span>By {pm.createdBy.name || pm.createdBy.email}</span>
                                        </div>

                                    </div>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                                        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </MobileCard>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
