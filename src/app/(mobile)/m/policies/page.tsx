import prisma from '@/lib/prisma';
import Link from 'next/link';
import { MobileEmptyState } from '@/components/mobile/MobileUtils';
import MobileCard from '@/components/mobile/MobileCard';

export const dynamic = 'force-dynamic';

export default async function MobilePoliciesPage() {
    const policies = await prisma.escalationPolicy.findMany({
        orderBy: { name: 'asc' },
        include: {
            steps: {
                orderBy: { stepOrder: 'asc' },
            },
            _count: {
                select: { services: true }
            }
        },
    });

    return (
        <div className="mobile-dashboard">
            {/* Header */}
            <div style={{ marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Escalation Policies</h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                    {policies.length} policies
                </p>
            </div>

            {/* Policy List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {policies.length === 0 ? (
                    <MobileEmptyState
                        icon="🛡️"
                        title="No policies"
                        description="Use desktop to create escalation policies"
                    />
                ) : (
                    policies.map((policy) => (
                        <Link key={policy.id} href={`/m/policies/${policy.id}`} style={{ textDecoration: 'none' }}>
                            <MobileCard padding="md">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{
                                            fontWeight: '600',
                                            fontSize: '0.95rem',
                                            color: 'var(--text-primary)',
                                            marginBottom: '0.25rem'
                                        }}>
                                            {policy.name}
                                        </div>
                                        {policy.description && (
                                            <div style={{
                                                fontSize: '0.8rem',
                                                color: 'var(--text-muted)',
                                                marginBottom: '0.5rem',
                                                lineHeight: 1.3
                                            }}>
                                                {policy.description}
                                            </div>
                                        )}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            fontSize: '0.75rem',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            {/* @ts-ignore */}
                                            <span>👣 {policy.steps.length} steps</span>
                                            <span>•</span>
                                            {/* @ts-ignore */}
                                            <span>🔧 {policy._count.services} services</span>
                                        </div>
                                    </div>

                                    <div style={{ color: 'var(--text-muted)' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                </div>
                            </MobileCard>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
