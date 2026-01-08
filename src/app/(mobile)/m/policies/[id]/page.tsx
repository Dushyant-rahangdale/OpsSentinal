import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import MobileCard from '@/components/mobile/MobileCard';
import { MobileAvatar } from '@/components/mobile/MobileUtils';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MobilePolicyDetailPage({ params }: PageProps) {
  const { id } = await params;

  const policy = await prisma.escalationPolicy.findUnique({
    where: { id },
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' },
        include: {
          targetUser: { select: { id: true, name: true, email: true } },
          targetTeam: { select: { id: true, name: true } },
          targetSchedule: { select: { id: true, name: true } },
        },
      },
      services: { select: { id: true, name: true } },
    },
  });

  if (!policy) {
    notFound();
  }

  // Group rules by stepOrder
  const stepsMap = new Map<number, typeof policy.steps>();
  policy.steps.forEach(rule => {
    const rules = stepsMap.get(rule.stepOrder) || [];
    rules.push(rule);
    stepsMap.set(rule.stepOrder, rules);
  });

  const sortedSteps = Array.from(stepsMap.entries()).sort((a, b) => a[0] - b[0]);

  return (
    <div className="mobile-dashboard">
      {/* Header */}
      <div>
        <Link
          href="/m/policies"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            color: 'var(--primary-color)',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: '600',
            marginBottom: '0.75rem',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Policies
        </Link>

        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, lineHeight: 1.3 }}>
            {policy.name}
          </h1>
          {policy.description && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              {policy.description}
            </div>
          )}
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>Escalation Steps</h3>

        {sortedSteps.length === 0 ? (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
            }}
          >
            No escalation steps defined.
          </div>
        ) : (
          sortedSteps.map(([stepOrder, rules]) => (
            <MobileCard key={stepOrder}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '0.5rem',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.75rem',
                  }}
                >
                  {stepOrder + 1}
                </div>
                <span
                  style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}
                >
                  Wait {rules[0].delayMinutes}m
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {rules.map(rule => (
                  <div
                    key={rule.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                  >
                    <div style={{ fontSize: '1.25rem' }}>
                      {rule.targetType === 'USER'
                        ? '👤'
                        : rule.targetType === 'SCHEDULE'
                          ? '📅'
                          : '�'}
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: '500',
                          fontSize: '0.9rem',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {rule.targetType === 'USER' && rule.targetUser
                          ? rule.targetUser.name || rule.targetUser.email
                          : rule.targetType === 'SCHEDULE' && rule.targetSchedule
                            ? rule.targetSchedule.name
                            : rule.targetType === 'TEAM' && rule.targetTeam
                              ? rule.targetTeam.name
                              : 'Unknown Target'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {rule.targetType === 'USER'
                          ? 'User'
                          : rule.targetType === 'SCHEDULE'
                            ? 'Schedule'
                            : 'Team'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </MobileCard>
          ))
        )}
      </div>

      {/* Used By Services */}
      {policy.services.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.75rem' }}>
            Used by Services
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {policy.services.map(service => (
              <Link
                key={service.id}
                href={`/m/services/${service.id}`}
                style={{
                  textDecoration: 'none',
                  background: 'var(--bg-surface)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                }}
              >
                {service.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
