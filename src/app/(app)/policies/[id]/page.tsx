import prisma from '@/lib/prisma';
import { getUserPermissions } from '@/lib/rbac';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PolicyStepCard from '@/components/PolicyStepCard';
import PolicyStepCreateForm from '@/components/PolicyStepCreateForm';
import PolicyDeleteButton from '@/components/PolicyDeleteButton';
import {
    updatePolicy,
    addPolicyStep,
    updatePolicyStep,
    deletePolicyStep,
    movePolicyStep
} from '../actions';
import ConfirmDialog from '@/components/ConfirmDialog';

export const revalidate = 30;

export default async function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const [policy, users, teams, schedules, services] = await Promise.all([
        prisma.escalationPolicy.findUnique({
            where: { id },
            include: {
                steps: {
                    include: {
                        targetUser: true,
                        targetTeam: true, // teamLead will be included if Prisma client is regenerated
                        targetSchedule: true
                    },
                    orderBy: { stepOrder: 'asc' }
                },
                services: {
                    include: { team: true },
                    orderBy: { name: 'asc' }
                }
            }
        }),
        prisma.user.findMany({
            where: { status: 'ACTIVE', role: { in: ['ADMIN', 'RESPONDER'] } },
            select: { id: true, name: true, email: true },
            orderBy: { name: 'asc' }
        }),
        prisma.team.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        }),
        prisma.onCallSchedule.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        }),
        prisma.service.findMany({
            where: { escalationPolicyId: id },
            include: { team: true },
            orderBy: { name: 'asc' }
        })
    ]);

    if (!policy) notFound();

    const permissions = await getUserPermissions();
    const canManagePolicies = permissions.isAdmin;

    return (
        <main style={{ padding: '1rem' }}>
            {/* Header */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '2rem',
                paddingBottom: '1.5rem',
                borderBottom: '2px solid var(--border)'
            }}>
                <div style={{ flex: 1 }}>
                    <Link
                        href="/policies"
                        className="schedule-back-link"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.9rem',
                            color: 'var(--text-secondary)',
                            textDecoration: 'none',
                            marginBottom: '0.75rem',
                            fontWeight: '500',
                            transition: 'color 0.2s'
                        }}
                    >
                        ← Back to policies
                    </Link>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: 'var(--text-primary)',
                        marginBottom: '0.5rem'
                    }}>
                        {policy.name}
                    </h1>
                    {policy.description && (
                        <p style={{
                            color: 'var(--text-secondary)',
                            fontSize: '0.95rem',
                            marginBottom: '0.5rem'
                        }}>
                            {policy.description}
                        </p>
                    )}
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                            color: '#0c4a6e',
                            border: '1px solid #bae6fd'
                        }}>
                            {policy.steps.length} {policy.steps.length === 1 ? 'step' : 'steps'}
                        </span>
                        <span style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                            color: '#0c4a6e',
                            border: '1px solid #bae6fd'
                        }}>
                            {services.length} {services.length === 1 ? 'service' : 'services'}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                <div>
                    {/* Escalation Steps Section */}
                    <section className="glass-panel" style={{
                        padding: '1.5rem',
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        marginBottom: '2rem'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1.5rem',
                            paddingBottom: '1rem',
                            borderBottom: '1px solid #e2e8f0'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                                    Escalation Steps
                                </h3>
                                <span
                                    title="Escalation steps define who gets notified and when. Steps are executed in order with the specified delay between each step."
                                    style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        background: '#e0f2fe',
                                        color: '#0c4a6e',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        cursor: 'help',
                                        border: '1px solid #bae6fd'
                                    }}
                                >
                                    ?
                                </span>
                            </div>
                        </div>

                        {policy.steps.length === 0 ? (
                            <p style={{
                                fontSize: '0.9rem',
                                color: 'var(--text-muted)',
                                padding: '2rem',
                                textAlign: 'center',
                                background: '#f8fafc',
                                borderRadius: '8px'
                            }}>
                                No escalation steps yet. Add a step to define who gets notified.
                            </p>
                        ) : (
                            <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                                {policy.steps.map((step, index) => (
                                    <PolicyStepCard
                                        key={step.id}
                                        step={{
                                            id: step.id,
                                            stepOrder: step.stepOrder,
                                            delayMinutes: step.delayMinutes,
                                            targetType: step.targetType,
                                            notificationChannels: step.notificationChannels || [],
                                            notifyOnlyTeamLead: step.notifyOnlyTeamLead || false,
                                            targetUser: step.targetUser ? {
                                                id: step.targetUser.id,
                                                name: step.targetUser.name,
                                                email: step.targetUser.email
                                            } : null,
                                            targetTeam: step.targetTeam ? {
                                                id: step.targetTeam.id,
                                                name: step.targetTeam.name,
                                                // teamLead available after Prisma client regeneration
                                                teamLead: (step.targetTeam as any).teamLead ? {
                                                    id: (step.targetTeam as any).teamLead.id,
                                                    name: (step.targetTeam as any).teamLead.name,
                                                    email: (step.targetTeam as any).teamLead.email
                                                } : null
                                            } : null,
                                            targetSchedule: step.targetSchedule ? {
                                                id: step.targetSchedule.id,
                                                name: step.targetSchedule.name
                                            } : null
                                        }}
                                        policyId={policy.id}
                                        canManagePolicies={canManagePolicies}
                                        updateStep={updatePolicyStep}
                                        deleteStep={deletePolicyStep}
                                        moveStep={movePolicyStep}
                                        isFirst={index === 0}
                                        isLast={index === policy.steps.length - 1}
                                    />
                                ))}
                            </div>
                        )}

                        {canManagePolicies && (
                            <PolicyStepCreateForm
                                policyId={policy.id}
                                users={users}
                                teams={teams}
                                schedules={schedules}
                                addStep={addPolicyStep}
                            />
                        )}
                    </section>
                </div>

                <aside>
                    {/* Policy Settings */}
                    {canManagePolicies ? (
                        <div className="glass-panel" style={{
                            padding: '1.5rem',
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            marginBottom: '2rem'
                        }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                Policy Settings
                            </h3>
                            <form action={updatePolicy.bind(null, policy.id)} style={{ display: 'grid', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                                        Name
                                    </label>
                                    <input
                                        name="name"
                                        defaultValue={policy.name}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.6rem',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            fontSize: '0.9rem',
                                            background: 'white'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '500' }}>
                                        Description
                                    </label>
                                    <textarea
                                        name="description"
                                        defaultValue={policy.description || ''}
                                        rows={3}
                                        style={{
                                            width: '100%',
                                            padding: '0.6rem',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            fontSize: '0.9rem',
                                            background: 'white',
                                            resize: 'vertical'
                                        }}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="glass-button primary"
                                    style={{ width: '100%' }}
                                >
                                    Save Changes
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="glass-panel" style={{
                            padding: '1.5rem',
                            background: '#f9fafb',
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                            marginBottom: '2rem',
                            opacity: 0.7
                        }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                ⚠️ You don't have access to edit policies. Admin role required.
                            </p>
                        </div>
                    )}

                    {/* Services Using This Policy */}
                    <div className="glass-panel" style={{
                        padding: '1.5rem',
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px'
                    }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                            Services Using This Policy
                        </h3>
                        {services.length === 0 ? (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                No services are using this policy yet.
                            </p>
                        ) : (
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                {services.map((service) => (
                                    <Link
                                        key={service.id}
                                        href={`/services/${service.id}`}
                                        className="service-link-card"
                                        style={{
                                            display: 'block',
                                            padding: '0.75rem',
                                            background: '#f8fafc',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                            textDecoration: 'none',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                            {service.name}
                                        </div>
                                        {service.team && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {service.team.name}
                                            </div>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Delete Policy */}
                    {canManagePolicies && (
                        <PolicyDeleteButton
                            policyId={policy.id}
                            servicesUsingPolicy={services.map(s => ({ id: s.id, name: s.name }))}
                        />
                    )}
                </aside>
            </div>
        </main>
    );
}
