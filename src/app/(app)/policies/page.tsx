import prisma from '@/lib/prisma';
import { getUserPermissions } from '@/lib/rbac';
import { createPolicy } from './actions';
import Link from 'next/link';
import { getDefaultAvatar } from '@/lib/avatar';

export const revalidate = 30;

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const [policies, users, teams] = await Promise.all([
    prisma.escalationPolicy.findMany({
      include: {
        steps: {
          include: {
            targetUser: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                gender: true,
              },
            },
            targetTeam: true,
            targetSchedule: true,
          },
          orderBy: { stepOrder: 'asc' },
        },
        services: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { status: 'ACTIVE', role: { in: ['ADMIN', 'RESPONDER'] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
    prisma.team.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  const permissions = await getUserPermissions();
  const canCreatePolicy = permissions.isAdmin;
  const resolvedSearchParams = await searchParams;
  const errorCode = resolvedSearchParams?.error;

  return (
    <main style={{ padding: '1rem' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
          paddingBottom: '1.5rem',
          borderBottom: '2px solid var(--border)',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: 'var(--text-primary)',
              marginBottom: '0.5rem',
            }}
          >
            Escalation Policies
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Define who gets notified when incidents occur and in what order.
          </p>
        </div>
      </header>

      {errorCode === 'duplicate-policy' && (
        <div
          className="glass-panel"
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            background: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            fontSize: '0.9rem',
            fontWeight: '600',
            borderRadius: '0px',
          }}
        >
          An escalation policy with this name already exists. Please choose a unique name.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Policies List */}
        <div>
          {policies.length === 0 ? (
            <div
              className="glass-panel"
              style={{
                padding: '3rem',
                textAlign: 'center',
                background: 'white',
              }}
            >
              <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                No escalation policies yet
              </p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Create your first escalation policy to define incident notification workflows.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {policies.map(policy => (
                <Link
                  key={policy.id}
                  href={`/policies/${policy.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    className="glass-panel policy-card"
                    style={{
                      padding: '1.5rem',
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '1rem',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <h3
                          style={{
                            fontWeight: '600',
                            fontSize: '1.2rem',
                            marginBottom: '0.5rem',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {policy.name}
                        </h3>
                        {policy.description && (
                          <p
                            style={{
                              color: 'var(--text-secondary)',
                              fontSize: '0.9rem',
                              marginBottom: '0.5rem',
                            }}
                          >
                            {policy.description}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <span
                          style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                            color: '#0c4a6e',
                            border: '1px solid #bae6fd',
                          }}
                        >
                          {policy.steps.length} {policy.steps.length === 1 ? 'step' : 'steps'}
                        </span>
                        <span
                          style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                            color: '#0c4a6e',
                            border: '1px solid #bae6fd',
                          }}
                        >
                          {policy.services.length}{' '}
                          {policy.services.length === 1 ? 'service' : 'services'}
                        </span>
                      </div>
                    </div>

                    {/* Preview of steps */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {policy.steps.slice(0, 3).map((step, _idx) => (
                        <div
                          key={step.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            fontSize: '0.85rem',
                            padding: '0.5rem',
                            background: '#f8fafc',
                            borderRadius: '6px',
                          }}
                        >
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: 'var(--primary-color)',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              fontSize: '0.75rem',
                              flexShrink: 0,
                            }}
                          >
                            {step.stepOrder + 1}
                          </div>
                          <div
                            style={{
                              flex: 1,
                              color: 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                            }}
                          >
                            {step.targetUser && (
                              <img
                                src={
                                  step.targetUser.avatarUrl ||
                                  getDefaultAvatar(step.targetUser.gender, step.targetUser.name)
                                }
                                alt={step.targetUser.name || ''}
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                }}
                              />
                            )}
                            <strong>
                              {step.targetUser?.name ||
                                step.targetTeam?.name ||
                                step.targetSchedule?.name ||
                                'Unknown target'}
                            </strong>
                            {step.targetType && step.targetType !== 'USER' && (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  color: 'var(--text-muted)',
                                  marginLeft: '0.5rem',
                                  fontWeight: 'normal',
                                }}
                              >
                                ({step.targetType})
                              </span>
                            )}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {step.delayMinutes === 0 ? 'Immediate' : `+${step.delayMinutes}m`}
                          </div>
                        </div>
                      ))}
                      {policy.steps.length > 3 && (
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                            fontStyle: 'italic',
                            paddingLeft: '2rem',
                          }}
                        >
                          +{policy.steps.length - 3} more step
                          {policy.steps.length - 3 !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Create Policy Form */}
        {canCreatePolicy ? (
          <div
            className="glass-panel"
            style={{
              padding: '1.5rem',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              height: 'fit-content',
              position: 'sticky',
              top: '1rem',
            }}
          >
            <h3
              style={{
                fontWeight: '600',
                marginBottom: '1rem',
                fontSize: '1.1rem',
                color: 'var(--text-primary)',
              }}
            >
              Create New Policy
            </h3>
            <form
              action={createPolicy}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.4rem',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                  }}
                >
                  Policy Name *
                </label>
                <input
                  name="name"
                  placeholder="e.g. Critical Escalation"
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: 'white',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.4rem',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                  }}
                >
                  Description
                </label>
                <textarea
                  name="description"
                  placeholder="Brief description of when to use this policy"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: 'white',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <label
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    display: 'block',
                    marginBottom: '0.5rem',
                  }}
                >
                  Step 1: Immediately notify *
                </label>
                <select
                  name="step-0-target"
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: 'white',
                  }}
                >
                  <option value="">Select target...</option>
                  <optgroup label="Teams">
                    {teams.map(t => (
                      <option key={`team-${t.id}`} value={`team:${t.id}`}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Users">
                    {users.map(u => (
                      <option key={`user-${u.id}`} value={`user:${u.id}`}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </optgroup>
                </select>
                <input type="hidden" name="step-0-delayMinutes" value="0" />
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <label
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    display: 'block',
                    marginBottom: '0.5rem',
                  }}
                >
                  Step 2: If no response, notify after (optional)
                </label>
                <select
                  name="step-1-target"
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: 'white',
                    marginBottom: '0.5rem',
                  }}
                >
                  <option value="">(None)</option>
                  <optgroup label="Teams">
                    {teams.map(t => (
                      <option key={`team-${t.id}`} value={`team:${t.id}`}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Users">
                    {users.map(u => (
                      <option key={`user-${u.id}`} value={`user:${u.id}`}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </optgroup>
                </select>
                <input
                  name="step-1-delayMinutes"
                  type="number"
                  min="0"
                  placeholder="Delay (minutes)"
                  defaultValue="15"
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: 'white',
                  }}
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <label
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    display: 'block',
                    marginBottom: '0.5rem',
                  }}
                >
                  Step 3: Final escalation (optional)
                </label>
                <select
                  name="step-2-target"
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: 'white',
                    marginBottom: '0.5rem',
                  }}
                >
                  <option value="">(None)</option>
                  <optgroup label="Teams">
                    {teams.map(t => (
                      <option key={`team-${t.id}`} value={`team:${t.id}`}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Users">
                    {users.map(u => (
                      <option key={`user-${u.id}`} value={`user:${u.id}`}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </optgroup>
                </select>
                <input
                  name="step-2-delayMinutes"
                  type="number"
                  min="0"
                  placeholder="Delay (minutes)"
                  defaultValue="30"
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: 'white',
                  }}
                />
              </div>

              <button
                type="submit"
                className="glass-button primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                Create Policy
              </button>
            </form>
          </div>
        ) : (
          <div
            className="glass-panel"
            style={{
              padding: '1.5rem',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              height: 'fit-content',
              opacity: 0.7,
            }}
          >
            <h3
              style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}
            >
              Create New Policy
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              ⚠️ You don't have access to create policies. Admin role required.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
