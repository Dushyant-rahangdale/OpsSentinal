'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { useModalState } from '@/hooks/useModalState';
import { getDefaultAvatar } from '@/lib/avatar';
import { useSidebar } from '@/contexts/SidebarContext';
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/shadcn/avatar';
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  HelpCircle,
  Settings,
  LogOut,
  Keyboard,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  section?: string;
  requiresRole?: string[];
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
    href: '/reports/executive',
    label: 'Executive Report',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
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
  userAvatar?: string | null;
  userGender?: string | null;
  userId?: string;
};

export default function Sidebar(
  { userName, userEmail, userRole, userAvatar, userGender, userId }: SidebarProps = {
    userName: null,
    userEmail: null,
    userRole: null,
    userAvatar: null,
    userGender: null,
    userId: 'user',
  }
) {
  const pathname = usePathname();
  const { isCollapsed, isMobile } = useSidebar();

  const [stats, setStats] = useState<{
    count: number;
    isClipped?: boolean;
    retentionDays?: number;
  } | null>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useModalState('sidebarMobileMenu');

  const sidebarId = 'app-sidebar';
  const isDesktopCollapsed = !isMobile && isCollapsed;
  const finalAvatarUrl = userAvatar || getDefaultAvatar(userGender, userId || 'user');

  useEffect(() => {
    fetch('/api/sidebar-stats')
      .then(res => res.json())
      .then(data =>
        setStats({
          count: data.activeIncidentsCount || 0,
          isClipped: data.isClipped,
          retentionDays: data.retentionDays,
        })
      )
      .catch(() => setStats({ count: 0 }));
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!isMobile && isMobileMenuOpen) setIsMobileMenuOpen(false);
  }, [isMobile, isMobileMenuOpen, setIsMobileMenuOpen]);

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  const groupedItems = useMemo(() => {
    return navigationItems.reduce(
      (acc, item) => {
        if (item.requiresRole) {
          if (!userRole || !item.requiresRole.includes(userRole)) return acc;
        }
        const section = item.section || 'MAIN';
        if (!acc[section]) acc[section] = [];
        acc[section].push(item);
        return acc;
      },
      {} as Record<string, NavItem[]>
    );
  }, [userRole]);

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);
    const showBadge = item.href === '/incidents' && stats !== null && stats.count > 0;

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        aria-label={isDesktopCollapsed ? item.label : undefined}
        title={isDesktopCollapsed ? item.label : undefined}
        className={cn(
          'group relative flex items-center rounded-xl text-sm font-medium',
          'transition-colors duration-150 motion-reduce:transition-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-foreground/0',
          'text-white/85 hover:text-white hover:bg-white/10',
          active && 'bg-white/15 text-white ring-1 ring-white/10',
          active &&
            'after:absolute after:left-0 after:top-2 after:bottom-2 after:w-[3px] after:rounded-r-full after:bg-white/70',
          isDesktopCollapsed ? 'h-11 w-11 justify-center px-0' : 'px-3 py-2.5 gap-3'
        )}
      >
        <span
          className={cn(
            'shrink-0 flex items-center justify-center opacity-85 group-hover:opacity-100',
            '[&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:shrink-0'
          )}
        >
          {item.icon}
        </span>

        {!isDesktopCollapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}

        {showBadge && (
          <span
            aria-label={`${stats!.count} active incidents`}
            className={cn(
              'shrink-0 inline-flex items-center justify-center font-bold bg-red-500 text-white',
              isDesktopCollapsed
                ? 'absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full'
                : 'ml-auto h-5 min-w-5 rounded-full px-1.5 text-[0.65rem]'
            )}
          >
            {isDesktopCollapsed ? '' : stats!.count > 99 ? '99+' : stats!.count}
          </span>
        )}
      </Link>
    );
  };

  const renderSection = (sectionName: string, items: NavItem[]) => {
    const sectionColors: Record<string, { dotClass: string; textClass: string }> = {
      OPERATIONS: { dotClass: 'bg-blue-500/80', textClass: 'text-white/75' },
      INSIGHTS: { dotClass: 'bg-purple-500/80', textClass: 'text-white/75' },
    };

    const colors = sectionColors[sectionName] || {
      dotClass: 'bg-white/50',
      textClass: 'text-white/75',
    };

    return (
      <div
        key={sectionName}
        className={cn('w-full', isDesktopCollapsed ? 'mb-3' : 'mb-5')}
        data-section={sectionName}
      >
        {!isDesktopCollapsed && sectionName !== 'MAIN' && (
          <div className="flex items-center gap-2 mb-2.5 px-1">
            <div className={cn('h-1 w-1 rounded-full', colors.dotClass)} />
            <span
              className={cn(
                'text-[0.65rem] font-semibold tracking-wide uppercase',
                colors.textClass
              )}
            >
              {sectionName}
            </span>
          </div>
        )}

        <div className={cn('flex flex-col gap-1', isDesktopCollapsed && 'items-center')}>
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
        id={sidebarId}
        aria-label="Main navigation"
        aria-hidden={isMobile && !isMobileMenuOpen}
        data-collapsed={isDesktopCollapsed ? 'true' : 'false'}
        className={cn(
          // Use original CSS class which has clamp() for zoom-resilient width
          'sidebar',
          isDesktopCollapsed && 'sidebar-collapsed',
          isMobile && 'sidebar-mobile',
          isMobileMenuOpen && 'sidebar-mobile-open'
        )}
      >
        {/* Compact Header */}
        <div
          className={cn(
            'relative shrink-0',
            'bg-gradient-to-b from-white/5 to-transparent',
            isDesktopCollapsed ? 'p-3' : 'p-4 md:p-5'
          )}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.05)_0%,transparent_55%)] pointer-events-none" />

          <div
            className={cn(
              'relative z-10 min-w-0',
              isDesktopCollapsed ? 'flex flex-col items-center gap-2' : 'flex items-center gap-3'
            )}
          >
            <Link
              href="/"
              className={cn(
                'flex items-center gap-3 no-underline overflow-hidden',
                isDesktopCollapsed ? 'flex-col justify-center gap-2' : 'flex-row'
              )}
            >
              <div
                className={cn(
                  'relative shrink-0 rounded-xl border border-white/12 bg-white/8',
                  'shadow-md flex items-center justify-center overflow-hidden',
                  isDesktopCollapsed ? 'h-10 w-10' : 'h-11 w-11 md:h-12 md:w-12'
                )}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,transparent_70%)] pointer-events-none" />
                <Image
                  src="/logo.svg"
                  alt="OpsSentinal logo"
                  width={40}
                  height={40}
                  className={cn(
                    'relative z-10 object-contain',
                    isDesktopCollapsed ? 'h-6 w-6' : 'h-7 w-7 md:h-8 md:w-8'
                  )}
                />
              </div>

              {!isDesktopCollapsed && (
                <h1
                  className="sidebar-brand-title"
                  style={{
                    fontSize: 'clamp(0.95rem, 2.2vw, 1.35rem)',
                    fontWeight: 800,
                    color: 'white',
                    margin: 0,
                    lineHeight: 1.2,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Ops
                  <wbr />
                  Sentinal
                </h1>
              )}
            </Link>
          </div>

          {isMobile && isMobileMenuOpen && (
            <Button
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close navigation menu"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 h-9 w-9 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Enhanced Scrollable Nav */}
        <nav
          className={cn(
            'flex-1 min-h-0 overflow-y-auto overflow-x-hidden',
            'overscroll-contain',
            // Enhanced scrollbar styling
            '[scrollbar-width:thin]',
            '[scrollbar-color:rgba(255,255,255,0.2)_transparent]',
            // Webkit scrollbar
            '[&::-webkit-scrollbar]:w-1.5',
            '[&::-webkit-scrollbar-track]:bg-transparent',
            '[&::-webkit-scrollbar-thumb]:bg-white/20',
            '[&::-webkit-scrollbar-thumb]:rounded-full',
            '[&::-webkit-scrollbar-thumb:hover]:bg-white/35',
            // Compact padding
            isDesktopCollapsed ? 'p-1.5' : 'p-2 md:p-3'
          )}
        >
          {Object.entries(groupedItems).map(([section, items]) => renderSection(section, items))}
        </nav>

        {/* Compact Footer */}
        <div
          className={cn('shrink-0 border-t border-white/10', isDesktopCollapsed ? 'p-2' : 'p-2.5')}
        >
          <div
            className={cn(
              'relative flex items-center rounded-md bg-white/8',
              isDesktopCollapsed ? 'p-1.5 justify-center' : 'p-2 gap-2'
            )}
          >
            {stats?.isClipped && (
              <div
                title={`Data retention limit: ${stats.retentionDays} days`}
                className="absolute right-1 top-1 h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center"
              >
                <AlertCircle className="h-3 w-3" />
              </div>
            )}

            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={finalAvatarUrl} alt={userName || 'User'} />
              <AvatarFallback className="bg-white/15 text-white text-sm font-semibold uppercase">
                {(userName || userEmail || 'U').slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            {!isDesktopCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">
                  {userName || userEmail || 'User'}
                </div>
                <div className="text-xs text-white/65 capitalize">
                  {userRole ? userRole.toLowerCase() : 'User'}
                </div>
              </div>
            )}
          </div>

          <div
            className={cn(
              'mt-2',
              isDesktopCollapsed ? 'flex flex-col gap-1.5' : 'grid grid-cols-3 gap-1.5'
            )}
          >
            <Link
              href="/help"
              onClick={() => isMobile && setIsMobileMenuOpen(false)}
              aria-label="Documentation"
              title="Documentation"
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-lg',
                'bg-white/5 border border-white/10 text-white/85 hover:bg-white/12 hover:text-white transition-colors',
                'p-2'
              )}
            >
              <HelpCircle className="h-4 w-4" />
              {!isDesktopCollapsed && <span className="text-[0.6rem] leading-none">Docs</span>}
            </Link>

            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('toggleKeyboardShortcuts'));
                if (isMobile) setIsMobileMenuOpen(false);
              }}
              aria-label="Show keyboard shortcuts"
              title="Keyboard Shortcuts"
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-lg cursor-pointer',
                'bg-white/5 border border-white/10 text-white/85 hover:bg-white/12 hover:text-white transition-colors',
                'p-2'
              )}
            >
              <Keyboard className="h-4 w-4" />
              {!isDesktopCollapsed && <span className="text-[0.6rem] leading-none">Keys</span>}
            </button>

            <Link
              href="/settings"
              onClick={() => isMobile && setIsMobileMenuOpen(false)}
              aria-label="Settings"
              title="Settings"
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-lg',
                'bg-white/5 border border-white/10 text-white/85 hover:bg-white/12 hover:text-white transition-colors',
                'p-2'
              )}
            >
              <Settings className="h-4 w-4" />
              {!isDesktopCollapsed && <span className="text-[0.6rem] leading-none">Settings</span>}
            </Link>
          </div>

          <Button
            variant="ghost"
            onClick={() => (window.location.href = '/api/auth/signout')}
            aria-label="Sign Out"
            title="Sign Out"
            className={cn(
              'mt-2 w-full flex items-center justify-center gap-2 h-8',
              'bg-white/10 hover:bg-white/15 border border-white/15 text-white text-sm'
            )}
          >
            <LogOut className="h-4 w-4" />
            {!isDesktopCollapsed && <span className="text-sm font-medium">Sign Out</span>}
          </Button>
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
  <Button
    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
    className={cn(
      'fixed left-4 top-4 z-[1001] h-11 w-11 rounded-lg shadow-lg',
      'bg-primary text-white',
      'transition-transform hover:scale-[1.02] active:scale-[0.98]',
      isMobile ? 'flex' : 'hidden'
    )}
    aria-label="Toggle navigation menu"
    aria-expanded={isMobileMenuOpen}
    size="icon"
  >
    {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
  </Button>
);

const MobileBackdrop = ({ isMobile, isMobileMenuOpen, setIsMobileMenuOpen }: MobileMenuProps) =>
  isMobile && isMobileMenuOpen ? (
    <div
      className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm"
      onClick={() => setIsMobileMenuOpen(false)}
      aria-hidden="true"
    />
  ) : null;
