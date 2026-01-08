'use client';

import Link from 'next/link';
import SidebarWidget, { WIDGET_ICON_BG } from '@/components/dashboard/SidebarWidget';

interface QuickActionsPanelProps {
  greeting: string;
  userName: string;
}

export default function QuickActionsPanel({ greeting, userName }: QuickActionsPanelProps) {
  const actions = [
    {
      href: '/incidents/create',
      label: 'Trigger Incident',
      icon: '🚨',
      variant: 'primary' as const,
    },
    {
      href: '/analytics',
      label: 'View Analytics',
      icon: '📊',
      variant: 'secondary' as const,
    },
    {
      href: '/services',
      label: 'Manage Services',
      icon: '⚙️',
      variant: 'secondary' as const,
    },
  ];

  return (
    <SidebarWidget
      title={`${greeting}, ${userName}`}
      iconBg={WIDGET_ICON_BG.slate}
      icon={<span style={{ fontSize: '18px', color: 'white' }}>⚡</span>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {actions.map((action, idx) => (
          <Link
            key={idx}
            href={action.href}
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius-sm)',
              background:
                action.variant === 'primary' ? 'var(--primary-color)' : 'var(--color-neutral-50)',
              color: action.variant === 'primary' ? 'white' : 'var(--text-secondary)',
              border: '1px solid',
              borderColor: action.variant === 'primary' ? 'var(--primary-color)' : 'var(--border)',
              fontWeight: 'var(--font-weight-medium)',
              fontSize: 'var(--font-size-sm)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              if (action.variant === 'primary') {
                e.currentTarget.style.background = 'var(--primary-hover)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              } else {
                e.currentTarget.style.background = 'var(--color-neutral-100)';
              }
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              if (action.variant === 'primary') {
                e.currentTarget.style.background = 'var(--primary-color)';
                e.currentTarget.style.boxShadow = 'none';
              } else {
                e.currentTarget.style.background = 'var(--color-neutral-50)';
              }
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span style={{ fontSize: '14px', opacity: 0.9 }}>{action.icon}</span>
            {action.label}
          </Link>
        ))}
      </div>
    </SidebarWidget>
  );
}
