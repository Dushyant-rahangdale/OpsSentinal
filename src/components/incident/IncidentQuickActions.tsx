'use client';

import Link from 'next/link';

type IncidentQuickActionsProps = {
    incidentId: string;
    serviceId: string;
};

export default function IncidentQuickActions({ incidentId, serviceId }: IncidentQuickActionsProps) {
    const actions = [
        {
            label: 'View Service',
            href: `/services/${serviceId}`,
            icon: (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16v5H4V6Zm0 7h16v5H4v-5Z" />
                </svg>
            )
        },
        {
            label: 'View in Analytics',
            href: `/analytics?incident=${incidentId}`,
            icon: (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 20V10m7 10V4m7 16v-7" strokeLinecap="round" />
                </svg>
            )
        }
    ];

    return (
        <div style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap'
        }}>
            {actions.map((action) => (
                <Link
                    key={action.href}
                    href={action.href}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.5rem 0.75rem',
                        background: '#fff',
                        border: '1px solid var(--border)',
                        borderRadius: '0px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        transition: 'all 0.15s',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary)';
                        e.currentTarget.style.background = '#fef2f2';
                        e.currentTarget.style.color = 'var(--primary)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.background = '#fff';
                        e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                >
                    {action.icon}
                    {action.label}
                </Link>
            ))}
        </div>
    );
}









