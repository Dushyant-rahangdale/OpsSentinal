'use client';

import { ReactNode } from 'react';

interface SidebarWidgetProps {
  title: string;
  icon: ReactNode;
  iconBg: string;
  children: ReactNode;
}

/**
 * Reusable sidebar widget wrapper with consistent styling.
 * Use this for any glass-panel widget in the dashboard sidebar.
 */
export default function SidebarWidget({ title, icon, iconBg, children }: SidebarWidgetProps) {
  return (
    <div className="glass-panel" style={{ background: 'white', padding: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
        <h3
          style={{
            fontSize: '1.1rem',
            fontWeight: '700',
            margin: 0,
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

// Common icon backgrounds for widgets
export const WIDGET_ICON_BG = {
  green: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%)',
  blue: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
  orange: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%)',
  purple: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(147, 51, 234, 0.05) 100%)',
  red: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
};

// Common icon colors
export const WIDGET_ICON_COLOR = {
  green: '#16a34a',
  blue: '#3b82f6',
  orange: '#f59e0b',
  purple: '#a855f7',
  red: '#ef4444',
};
