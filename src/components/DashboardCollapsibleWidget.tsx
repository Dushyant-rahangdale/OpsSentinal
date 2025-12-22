'use client';

import { useState, ReactNode, useEffect } from 'react';

type DashboardCollapsibleWidgetProps = {
  title: string;
  icon?: ReactNode;
  defaultExpanded?: boolean;
  children: ReactNode;
};

export default function DashboardCollapsibleWidget({
  title,
  icon,
  defaultExpanded = true,
  children
}: DashboardCollapsibleWidgetProps) {
  // Always start as expanded - ensure this happens after hydration
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Ensure expanded state matches defaultExpanded after mount
    setIsExpanded(defaultExpanded !== false);
  }, [defaultExpanded]);

  const toggleExpanded = () => {
    setIsExpanded(prev => !prev);
  };

  // Show content during SSR to prevent layout shift
  const shouldShowContent = isMounted ? isExpanded : (defaultExpanded !== false);

  return (
    <div className="glass-panel" style={{ background: 'white', padding: '0', overflow: 'hidden' }}>
      <button
        onClick={toggleExpanded}
        type="button"
        style={{
          width: '100%',
          padding: '1rem 1.5rem',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'background 0.2s ease'
        }}
        className="dashboard-collapsible-header"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {icon}
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
            {title}
          </h3>
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            transform: shouldShowContent ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
            color: 'var(--text-muted)'
          }}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {shouldShowContent && (
        <div style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
          {children}
        </div>
      )}
    </div>
  );
}

