'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import _KeyboardShortcuts from './KeyboardShortcuts';
import { useModalState } from '@/hooks/useModalState';

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  section?: string; // For grouping items
  requiresRole?: string[]; // Optional role requirements
};

const navigationItems: NavItem[] = [
  // Main Navigation
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" />
      </svg>
    ),
  },
  {
    href: '/incidents',
    label: 'Incidents',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3 2.5 20h19L12 3Zm0 6 4.5 9h-9L12 9Zm0 3v4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/services',
    label: 'Services',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M4 6h16v5H4V6Zm0 7h16v5H4v-5Z" />
      </svg>
    ),
  },
  // Operations Section
  {
    href: '/teams',
    label: 'Teams',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M7 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm10 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM3 19a4 4 0 0 1 8 0v1H3v-1Zm10 1v-1a4 4 0 0 1 8 0v1h-8Z" />
      </svg>
    ),
    section: 'OPERATIONS',
  },
  {
    href: '/users',
    label: 'Users',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 20a6 6 0 0 1 16 0v1H4v-1Z" />
      </svg>
    ),
    section: 'OPERATIONS',
  },
  {
    href: '/schedules',
    label: 'Schedules',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 3v3m10-3v3M4 9h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Z" strokeLinecap="round" />
      </svg>
    ),
    section: 'OPERATIONS',
  },
  {
    href: '/policies',
    label: 'Escalation Policies',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5Z" />
      </svg>
    ),
    section: 'OPERATIONS',
  },
  // Insights Section
  {
    href: '/analytics',
    label: 'Analytics',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 20V10m7 10V4m7 16v-7" strokeLinecap="round" />
      </svg>
    ),
    section: 'INSIGHTS',
  },
  {
    href: '/postmortems',
    label: 'Postmortems',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <path
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    section: 'INSIGHTS',
  },
  {
    href: '/status',
    label: 'Status Page',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <path
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    section: 'INSIGHTS',
  },
  {
    href: '/action-items',
    label: 'Action Items',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <path
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    section: 'INSIGHTS',
  },
  {
    href: '/events',
    label: 'Event Logs',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M5 4h14v4H5V4Zm0 6h14v4H5v-4Zm0 6h14v4H5v-4Z" />
      </svg>
    ),
    section: 'INSIGHTS',
  },
  {
    href: '/audit',
    label: 'Audit Log',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M6 4h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm8 1.5V8h2.5L14 5.5ZM8 11h8v2H8v-2Zm0 4h8v2H8v-2Z" />
      </svg>
    ),
    section: 'INSIGHTS',
  },
  {
    href: '/monitoring',
    label: 'Monitoring',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18M7 16l4-4 4 4 6-6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="7" cy="16" r="1" />
        <circle cx="11" cy="12" r="1" />
        <circle cx="15" cy="12" r="1" />
        <circle cx="21" cy="6" r="1" />
      </svg>
    ),
    section: 'INSIGHTS',
    requiresRole: ['ADMIN'],
  },
];

type SidebarProps = {
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
};

export default function Sidebar(
  { userName, userEmail, userRole }: SidebarProps = {
    userName: null,
    userEmail: null,
    userRole: null,
  }
) {
  const pathname = usePathname();
  const [activeIncidentsCount, setActiveIncidentsCount] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useModalState('sidebarMobileMenu');

  useEffect(() => {
    // Fetch active incidents count
    fetch('/api/sidebar-stats')
      .then(res => res.json())
      .then(data => setActiveIncidentsCount(data.activeIncidentsCount || 0))
      .catch(() => setActiveIncidentsCount(0));
  }, []);

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Close mobile menu on route change
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [pathname]);

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  // Group items by section and filter by role
  const groupedItems = navigationItems.reduce(
    (acc, item) => {
      // Filter by role requirements
      if (item.requiresRole && userRole) {
        if (!item.requiresRole.includes(userRole)) {
          return acc; // Skip this item
        }
      }

      const section = item.section || 'MAIN';
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push(item);
      return acc;
    },
    {} as Record<string, NavItem[]>
  );

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);
    const showBadge =
      item.href === '/incidents' && activeIncidentsCount !== null && activeIncidentsCount > 0;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`nav-item ${active ? 'active' : ''}`}
        style={{
          padding: 'clamp(0.5rem, 1vw, 0.625rem) clamp(0.6rem, 1.2vw, 0.75rem)',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          borderRadius: '7px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
          color: active ? 'white' : 'rgba(255,255,255,0.75)',
          fontWeight: active ? '700' : '500',
          fontSize: 'clamp(0.82rem, 1.05vw, 0.9rem)',
          border: active ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.transform = 'translateX(4px)';
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
            e.currentTarget.style.transform = 'translateX(0)';
          }
        }}
      >
        <span
          className="nav-icon"
          style={{
            width: 'clamp(16px, 1.8vw, 18px)',
            height: 'clamp(16px, 1.8vw, 18px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            opacity: active ? 1 : 0.8,
          }}
        >
          {item.icon}
        </span>
        <span style={{ whiteSpace: 'nowrap', flex: 1 }}>{item.label}</span>
        {showBadge && (
          <span
            aria-label={`${activeIncidentsCount} active incidents`}
            style={{
              minWidth: '18px',
              height: '18px',
              padding: '0 5px',
              background: '#ef4444',
              color: 'white',
              fontSize: 'clamp(0.6rem, 0.85vw, 0.7rem)',
              fontWeight: '700',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {activeIncidentsCount > 99 ? '99+' : activeIncidentsCount}
          </span>
        )}
      </Link>
    );
  };

  const renderSection = (sectionName: string, items: NavItem[]) => {
    if (sectionName === 'MAIN') {
      return (
        <div key={sectionName} style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {items.map(renderNavItem)}
          </div>
        </div>
      );
    }

    // Minimal badge-style section header for OPERATIONS and INSIGHTS
    const sectionColors: Record<string, { dot: string; text: string }> = {
      OPERATIONS: {
        dot: 'rgba(59, 130, 246, 0.8)', // Blue
        text: 'rgba(255,255,255,0.75)',
      },
      INSIGHTS: {
        dot: 'rgba(168, 85, 247, 0.8)', // Purple
        text: 'rgba(255,255,255,0.75)',
      },
    };

    const colors = sectionColors[sectionName] || {
      dot: 'rgba(255,255,255,0.5)',
      text: 'rgba(255,255,255,0.75)',
    };

    return (
      <div key={sectionName} style={{ marginBottom: '1.25rem' }}>
        {/* Minimal section header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.625rem',
            paddingLeft: '0.25rem',
          }}
        >
          <div
            style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: colors.dot,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 'clamp(0.6rem, 0.85vw, 0.7rem)',
              fontWeight: '600',
              color: colors.text,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            {sectionName}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {items.map(renderNavItem)}
        </div>
      </div>
    );
  };

  return (
    <>
      <MobileMenuButton
        isMobile={isMobile}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      <MobileBackdrop
        isMobile={isMobile}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      <aside
        className={`sidebar ${isMobile ? 'sidebar-mobile' : ''} ${isMobileMenuOpen ? 'sidebar-mobile-open' : ''}`}
        style={{
          width: isMobile ? '280px' : 'var(--sidebar-width)',
          background: 'var(--gradient-primary)',
          borderRight: '1px solid rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: isMobile ? 'fixed' : 'sticky',
          top: 0,
          left: 0,
          color: 'white',
          boxShadow: '2px 0 20px rgba(0, 0, 0, 0.08), inset -1px 0 0 rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          zIndex: 1000,
          transition: isMobile ? 'transform var(--transition-slow) var(--ease-out)' : 'none',
          transform: isMobile && !isMobileMenuOpen ? 'translateX(-100%)' : 'translateX(0)',
          visibility: isMobile && !isMobileMenuOpen ? 'hidden' : 'visible',
        }}
        aria-label="Main navigation"
      >
        {' '}
        {/* Branding Header - Enhanced */}
        <div
          style={{
            padding:
              'clamp(1rem, 2vw, 1.5rem) clamp(1rem, 2vw, 1.25rem) clamp(0.9rem, 1.8vw, 1.25rem)',
            flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle background pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.05) 0%, transparent 50%)',
              pointerEvents: 'none',
            }}
          />

          <Link
            href="/"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.875rem',
              position: 'relative',
              zIndex: 1,
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateX(2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <div
              style={{
                width: 'clamp(34px, 3.6vw, 42px)',
                height: 'clamp(34px, 3.6vw, 42px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 'clamp(9px, 1vw, 11px)',
                flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Logo glow effect */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'radial-gradient(circle at center, rgba(255,255,255,0.2) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }}
              />
              <img
                src="/logo.svg"
                alt="OpsSentinal"
                style={{
                  width: 'clamp(22px, 2.6vw, 28px)',
                  height: 'clamp(22px, 2.6vw, 28px)',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))',
                  position: 'relative',
                  zIndex: 1,
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              <h1
                style={{
                  fontSize: 'clamp(1.1rem, 2vw, 1.35rem)',
                  fontWeight: '800',
                  color: 'white',
                  margin: 0,
                  lineHeight: '1.2',
                  letterSpacing: '-0.4px',
                  textShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
              >
                OpsSentinal
              </h1>
              <div
                style={{
                  fontSize: 'clamp(0.6rem, 0.85vw, 0.7rem)',
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: '600',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                Enterprise
              </div>
            </div>
          </Link>
        </div>
        {/* Scrollable Navigation Area */}
        <nav
          className="sidebar-nav"
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: 'clamp(0.75rem, 1.6vw, 1rem) clamp(0.6rem, 1.4vw, 0.75rem)',
            gap: '0.5rem',
          }}
        >
          {Object.entries(groupedItems).map(([section, items]) => renderSection(section, items))}
        </nav>
        {/* Close button for mobile */}
        {isMobile && isMobileMenuOpen && (
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all var(--transition-base)',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        {/* User Profile and Footer - Refined */}
        <div
          style={{
            padding: '1rem 0.75rem',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            flexShrink: 0,
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {/* User Profile - Compact */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '8px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                fontSize: 'clamp(0.72rem, 1vw, 0.85rem)',
                color: 'white',
                flexShrink: 0,
                textTransform: 'uppercase',
              }}
            >
              {userName
                ? userName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : userEmail
                  ? userEmail[0].toUpperCase()
                  : 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 'clamp(0.82rem, 1.05vw, 0.9rem)',
                  fontWeight: '600',
                  color: 'white',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: '0.125rem',
                }}
              >
                {userName || userEmail || 'User'}
              </div>
              <div
                style={{
                  fontSize: 'clamp(0.62rem, 0.9vw, 0.72rem)',
                  color: 'rgba(255,255,255,0.65)',
                  textTransform: 'capitalize',
                }}
              >
                {userRole ? userRole.toLowerCase() : 'User'}
              </div>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.5rem',
            }}
          >
            {/* Documentation Link */}
            <Link
              href="/help"
              onClick={() => isMobile && setIsMobileMenuOpen(false)}
              aria-label="Documentation"
              style={{
                padding: '0.5rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 'clamp(0.62rem, 0.9vw, 0.75rem)',
                fontWeight: '500',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                textAlign: 'center',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3m0 4h.01" />
              </svg>
              <span style={{ fontSize: 'clamp(0.58rem, 0.85vw, 0.7rem)', lineHeight: '1' }}>
                Docs
              </span>
            </Link>

            {/* Shortcuts Button */}
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('toggleKeyboardShortcuts'));
                if (isMobile) setIsMobileMenuOpen(false);
              }}
              aria-label="Show keyboard shortcuts"
              style={{
                padding: '0.5rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 'clamp(0.62rem, 0.9vw, 0.75rem)',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                textAlign: 'center',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <path d="M9 6h6m-6 4h6m-2 4h2" />
              </svg>
              <span style={{ fontSize: 'clamp(0.58rem, 0.85vw, 0.7rem)', lineHeight: '1' }}>
                Keys
              </span>
            </button>

            {/* Settings Link */}
            <Link
              href="/settings"
              onClick={() => isMobile && setIsMobileMenuOpen(false)}
              aria-label="Settings"
              style={{
                padding: '0.5rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 'clamp(0.62rem, 0.9vw, 0.75rem)',
                fontWeight: '500',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                textAlign: 'center',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
              </svg>
              <span style={{ fontSize: 'clamp(0.58rem, 0.85vw, 0.7rem)', lineHeight: '1' }}>
                Settings
              </span>
            </Link>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => (window.location.href = '/api/auth/signout')}
            style={{
              width: '100%',
              padding: '0.625rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              color: 'white',
              fontSize: 'clamp(0.72rem, 1vw, 0.85rem)',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

interface MobileMenuProps {
  isMobile: boolean;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

const MobileMenuButton = ({ isMobile, isMobileMenuOpen, setIsMobileMenuOpen }: MobileMenuProps) => (
  <button
    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
    className="mobile-menu-button"
    aria-label="Toggle navigation menu"
    aria-expanded={isMobileMenuOpen}
    style={{
      display: isMobile ? 'flex' : 'none',
      position: 'fixed',
      top: '1rem',
      left: '1rem',
      zIndex: 1001,
      width: '44px',
      height: '44px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--primary)',
      border: 'none',
      color: 'white',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: 'var(--shadow-lg)',
      transition: 'all var(--transition-base)',
    }}
  >
    {isMobileMenuOpen ? (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ) : (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    )}
  </button>
);

const MobileBackdrop = ({ isMobile, isMobileMenuOpen, setIsMobileMenuOpen }: MobileMenuProps) =>
  isMobile && isMobileMenuOpen ? (
    <div
      className="mobile-sidebar-backdrop"
      onClick={() => setIsMobileMenuOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 999,
        animation: 'fadeIn var(--transition-base)',
      }}
      aria-hidden="true"
    />
  ) : null;
