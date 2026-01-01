import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import MobileCard from '@/components/mobile/MobileCard';

export const dynamic = 'force-dynamic';

type PageProps = {
    params: Promise<{ id: string }>;
};

export default async function MobilePostmortemDetailPage({ params }: PageProps) {
    const { id } = await params;

    const pm = await prisma.postmortem.findUnique({
        where: { id },
        include: {
            incident: {
                select: {
                    title: true,
                    service: { select: { name: true } },
                    createdAt: true,
                    resolvedAt: true
                }
            },
            createdBy: { select: { name: true, email: true } },
        }
    });

    if (!pm) {
        notFound();
    }

    return (
        <div className="mobile-dashboard">
            {/* Header */}
            <div>
                <Link
                    href="/m/postmortems"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        color: 'var(--primary)',
                        textDecoration: 'none',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        marginBottom: '0.75rem',
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Back to Postmortems
                </Link>

                <div style={{ marginBottom: '1rem' }}>
                    <div style={{
                        display: 'inline-block',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        background: pm.status === 'PUBLISHED' ? 'var(--badge-success-bg)' : 'var(--badge-neutral-bg)',
                        color: pm.status === 'PUBLISHED' ? 'var(--badge-success-text)' : 'var(--badge-neutral-text)',
                        marginBottom: '0.5rem'
                    }}>
                        {pm.status}
                    </div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, lineHeight: 1.3 }}>
                        Postmortem: {pm.incident.title}
                    </h1>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Author: {pm.createdBy.name || pm.createdBy.email}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <MobileCard>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem' }}>Executive Summary</h3>
                    <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                        {pm.summary || 'No summary provided.'}
                    </div>
                </MobileCard>

                <MobileCard>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.5rem' }}>Root Cause</h3>
                    <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                        {pm.rootCause || 'No root cause analysis provided.'}
                    </div>
                </MobileCard>

                {/* Could add Lessons Learned, Timeline, etc here */}
            </div>
        </div>
    );
}
