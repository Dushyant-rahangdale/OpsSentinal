'use client';

import { ReactNode, useState } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  fullWidth?: boolean;
  className?: string;
}

export default function Tabs({
  tabs,
  defaultTab,
  onChange,
  variant = 'default',
  fullWidth = false,
  className = '',
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab && !tab.disabled) {
      setActiveTab(tabId);
      onChange?.(tabId);
    }
  };

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

  const variantStyles = {
    default: {
      borderBottom: '2px solid var(--border)',
    },
    pills: {
      background: 'var(--color-neutral-100)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--spacing-1)',
    },
    underline: {
      borderBottom: '1px solid var(--border)',
    },
  };

  const activeTabStyles = {
    default: {
      borderBottom: '2px solid var(--primary)',
      color: 'var(--primary)',
      marginBottom: '-2px',
    },
    pills: {
      background: 'white',
      color: 'var(--primary)',
      boxShadow: 'var(--shadow-sm)',
    },
    underline: {
      borderBottom: '2px solid var(--primary)',
      color: 'var(--primary)',
      marginBottom: '-1px',
    },
  };

  return (
    <div className={`ui-tabs ${className}`} style={{ width: '100%' }}>
      <div
        className={`ui-tabs-header ui-tabs-${variant}`}
        style={{
          display: 'flex',
          gap: variant === 'pills' ? 'var(--spacing-1)' : 'var(--spacing-6)',
          ...variantStyles[variant],
          marginBottom: 'var(--spacing-6)',
        }}
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => handleTabChange(tab.id)}
              disabled={tab.disabled}
              className={`ui-tab ui-tab-${variant} ${isActive ? 'ui-tab-active' : ''}`}
              style={{
                padding: variant === 'pills' ? 'var(--spacing-2) var(--spacing-4)' : 'var(--spacing-3) var(--spacing-2)',
                background: 'transparent',
                border: 'none',
                borderBottom: variant === 'default' || variant === 'underline' ? '2px solid transparent' : 'none',
                color: tab.disabled ? 'var(--text-muted)' : isActive ? 'var(--primary)' : 'var(--text-secondary)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: isActive ? 600 : 500,
                cursor: tab.disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
                transition: 'all var(--transition-base) var(--ease-out)',
                flex: fullWidth ? 1 : 'none',
                justifyContent: 'center',
                opacity: tab.disabled ? 0.5 : 1,
                ...(isActive ? activeTabStyles[variant] : {}),
              }}
              onMouseEnter={(e) => {
                if (!tab.disabled && !isActive) {
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!tab.disabled && !isActive) {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              {tab.icon && <span>{tab.icon}</span>}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        style={{
          animation: 'fadeIn var(--transition-base) var(--ease-out)',
        }}
      >
        {activeTabContent}
      </div>
    </div>
  );
}


