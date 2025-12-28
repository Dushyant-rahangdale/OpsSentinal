'use client';

import { useState } from 'react';
import Link from 'next/link';

type CreateServiceFormProps = {
    teams: Array<{ id: string; name: string }>;
    policies: Array<{ id: string; name: string }>;
    createAction: (formData: FormData) => void;
};

export default function CreateServiceForm({ teams, policies, createAction }: CreateServiceFormProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (!isOpen) {
        return (
            <div className="glass-panel" style={{
                padding: '1.25rem',
                marginBottom: '1.5rem',
                background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid var(--border)',
                borderRadius: '0px',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
                onClick={() => setIsOpen(true)}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(211, 47, 47, 0.08)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '1.2rem',
                            fontWeight: 'bold'
                        }}>
                            +
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                                Create New Service
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Add a new service to monitor and manage incidents
                            </p>
                        </div>
                    </div>
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ color: 'var(--text-muted)', transition: 'transform 0.2s' }}
                    >
                        <path d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{
            padding: '1.5rem',
            marginBottom: '1.5rem',
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: '0px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                    Create New Service
                </h2>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                    }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        color: 'var(--text-muted)',
                        borderRadius: '4px',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            <form action={createAction} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                        Service Name *
                    </label>
                    <input
                        name="name"
                        required
                        placeholder="e.g. API Gateway"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid var(--border)',
                            borderRadius: '0px',
                            fontSize: '0.9rem',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                        Description
                    </label>
                    <input
                        name="description"
                        placeholder="Brief description of the service"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid var(--border)',
                            borderRadius: '0px',
                            fontSize: '0.9rem',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                        Region
                    </label>
                    <input
                        name="region"
                        placeholder="e.g. US-East, EU-West"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid var(--border)',
                            borderRadius: '0px',
                            fontSize: '0.9rem',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        Optional. Used to display impacted regions on the public status page.
                    </p>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                        SLA Tier
                    </label>
                    <input
                        name="slaTier"
                        placeholder="e.g. Gold, Silver, Bronze"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid var(--border)',
                            borderRadius: '0px',
                            fontSize: '0.9rem',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        Optional. Displayed on the public status page when enabled.
                    </p>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                        Owner Team
                    </label>
                    <select
                        name="teamId"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid var(--border)',
                            borderRadius: '0px',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            outline: 'none',
                            background: 'white',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    >
                        <option value="">Unassigned</option>
                        {teams.map((team) => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                        Escalation Policy
                        <span
                            title="Defines who gets notified when incidents occur and in what order. You can create policies in the Policies section."
                            style={{
                                marginLeft: '0.5rem',
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                background: '#e0f2fe',
                                color: '#0c4a6e',
                                display: 'inline-flex',
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
                    </label>
                    <select
                        name="escalationPolicyId"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid var(--border)',
                            borderRadius: '0px',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            outline: 'none',
                            background: 'white',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    >
                        <option value="">No escalation policy</option>
                        {policies.map((policy) => (
                            <option key={policy.id} value={policy.id}>{policy.name}</option>
                        ))}
                    </select>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.5 }}>
                        Select an escalation policy to define incident notification workflow. <Link href="/policies" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}>Manage policies →</Link>
                    </p>
                </div>
                <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                    <div style={{
                        padding: '1rem 1.25rem',
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        border: '2px solid #fbbf24',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'start',
                        gap: '0.75rem'
                    }}>
                        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>💡</span>
                        <div>
                            <p style={{
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                color: '#78350f',
                                marginBottom: '0.25rem',
                                lineHeight: 1.4
                            }}>
                                Configure Service-Level Notifications After Creation
                            </p>
                            <p style={{
                                fontSize: '0.8rem',
                                color: '#92400e',
                                lineHeight: 1.5,
                                margin: 0
                            }}>
                                Once your service is created, navigate to the service settings to set up advanced notification channels including Slack, Microsoft Teams, webhooks, and more.
                            </p>
                        </div>
                    </div>
                </div>
                <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="glass-button"
                        style={{ padding: '0.75rem 1.5rem' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="glass-button primary"
                        style={{ padding: '0.75rem 1.5rem' }}
                    >
                        Create Service
                    </button>
                </div>
            </form>
        </div>
    );
}









