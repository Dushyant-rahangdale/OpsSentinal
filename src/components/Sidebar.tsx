'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { useModalState } from '@/hooks/useModalState';
import { useSidebar } from '@/contexts/SidebarContext';
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/shadcn/avatar';
import {
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
  HelpCircle,
  Settings,
  LogOut,
  Keyboard,
  LayoutDashboard,
  AlertTriangle,
  Server,
  Users,
  User,
  Calendar,
  ShieldAlert,
  FileClock,
  ClipboardList,
  PieChart,
  FileWarning,
  Activity,
  ListTodo,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDefaultAvatar } from '@/lib/avatar';

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
    icon: <LayoutDashboard />,
  },
  {
    href: '/incidents',
    label: 'Incidents',
    icon: <AlertTriangle />,
  },
  {
    href: '/services',
    label: 'Services',
    icon: <Server />,
  },

  // Operations Section
  {
    href: '/teams',
    label: 'Teams',
    icon: <Users />,
    section: 'OPERATIONS',
  },
  {
    href: '/users',
    label: 'Users',
    icon: <User />,
  },
  {
    href: '/schedules',
    label: 'Schedules',
    icon: <Calendar />,
    section: 'OPERATIONS',
  },
  {
    href: '/policies',
    label: 'Escalation Policies',
    icon: <ShieldAlert />,
    section: 'OPERATIONS',
  },

  // Insights Section
  {
    href: '/analytics',
    label: 'Analytics',
    icon: <PieChart />,
    section: 'INSIGHTS',
  },
  {
    href: '/postmortems',
    label: 'Postmortems',
    icon: <FileWarning />,
    section: 'INSIGHTS',
  },
  {
    href: '/status',
    label: 'Status Page',
    icon: <Activity />,
    section: 'INSIGHTS',
  },
  {
    href: '/action-items',
    label: 'Action Items',
    icon: <ListTodo />,
    section: 'INSIGHTS',
  },
  {
    href: '/events',
    label: 'Event Logs',
    icon: <FileClock />,
    section: 'INSIGHTS',
  },
  {
    href: '/audit',
    label: 'Audit Log',
    icon: <ClipboardList />,
    section: 'INSIGHTS',
  },
  {
    href: '/reports/executive',
    label: 'Executive Report',
    icon: <PieChart />,
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
  const { data: session } = useSession();
  const { isCollapsed, isMobile, toggleSidebar } = useSidebar();

  // Prefer client-side session data for immediate updates
  const currentName = session?.user?.name || userName;
  const currentEmail = session?.user?.email || userEmail;
  const currentRole = (session?.user as any)?.role || userRole;
  const currentAvatar = session?.user?.image || session?.user?.avatarUrl || userAvatar;
  const currentGender = (session?.user as any)?.gender || userGender;

  const [stats, setStats] = useState<{
    count: number;
    isClipped?: boolean;
    retentionDays?: number;
  } | null>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useModalState('sidebarMobileMenu');

  const sidebarId = 'app-sidebar';
  const isDesktopCollapsed = !isMobile && isCollapsed;

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
          if (!currentRole || !item.requiresRole.includes(currentRole)) return acc;
        }
        const section = item.section || 'MAIN';
        // eslint-disable-next-line security/detect-object-injection
        if (!acc[section]) acc[section] = [];
        acc[section].push(item);
        return acc;
      },
      {} as Record<string, NavItem[]>
    );
  }, [currentRole]);

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
            '[&_svg]:h-5 [&_svg]:w-5 [&_svg]:shrink-0'
          )}
        >
          {item.icon}
        </span>

        {!isDesktopCollapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}

        {showBadge &&
          (isDesktopCollapsed ? (
            <Badge
              variant="danger"
              size="xs"
              aria-label={`${stats!.count} active incidents`}
              className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full p-0"
            >
              <span className="sr-only">{stats!.count > 99 ? '99+' : stats!.count}</span>
            </Badge>
          ) : (
            <Badge
              variant="danger"
              size="xs"
              aria-label={`${stats!.count} active incidents`}
              className="ml-auto h-5 min-w-5 rounded-full px-1.5"
            >
              {stats!.count > 99 ? '99+' : stats!.count}
            </Badge>
          ))}
      </Link>
    );
  };

  const renderSection = (sectionName: string, items: NavItem[]) => {
    const sectionColors: Record<string, { dotClass: string; textClass: string }> = {
      OPERATIONS: { dotClass: 'bg-blue-500/80', textClass: 'text-white/75' },
      INSIGHTS: { dotClass: 'bg-purple-500/80', textClass: 'text-white/75' },
    };

    // eslint-disable-next-line security/detect-object-injection
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
          isMobileMenuOpen && 'sidebar-mobile-open',
          !isMobile && '[zoom:0.8] h-[125vh]',
          !isMobile && !isDesktopCollapsed && '!w-72'
        )}
      >
        {/* Enhanced Header with Branding */}
        <div
          className={cn(
            'relative shrink-0 border-b border-white/10',
            'bg-gradient-to-b from-white/5 to-transparent',
            isDesktopCollapsed ? 'p-3.5 px-2.5 pb-3' : 'p-3 md:p-4'
          )}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.05)_0%,transparent_55%)] pointer-events-none" />

          <Link
            href="/"
            className={cn(
              'relative z-10 flex items-center no-underline transition-transform hover:translate-x-0.5',
              isDesktopCollapsed
                ? 'flex-col justify-center gap-2 w-full'
                : 'flex-row justify-start gap-2.5'
            )}
          >
            <div
              className={cn(
                'relative shrink-0 rounded-xl border border-white/12 bg-white/8',
                'shadow-md flex items-center justify-center overflow-hidden',
                'transition-transform hover:scale-105',
                isDesktopCollapsed ? 'h-10 w-10' : 'h-10 w-10 md:h-11 md:w-11'
              )}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,transparent_70%)] pointer-events-none" />
              <Image
                src="/logo.svg"
                alt="OpsSentinal logo"
                width={48}
                height={48}
                className={cn(
                  'relative z-10 object-contain',
                  isDesktopCollapsed ? 'h-6 w-6' : 'h-7 w-7 md:h-8 md:w-8'
                )}
              />
            </div>

            {!isDesktopCollapsed && (
              <div className="flex flex-col gap-0.5 min-w-0">
                <h1 className="text-base md:text-lg font-extrabold text-white m-0 leading-tight tracking-tight">
                  OpsSentinel
                </h1>
                <Badge
                  variant="info"
                  size="xs"
                  className={cn(
                    'w-fit mt-1 uppercase tracking-wider',
                    'backdrop-blur-sm transition-colors'
                  )}
                >
                  Incident Response
                </Badge>
              </div>
            )}
          </Link>

          {/* World-Class Desktop Collapse Toggle Button */}
          {!isMobile && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={cn(
                'absolute -right-3 top-1/2 -translate-y-1/2 z-20',
                'w-6 h-6 rounded-full group',
                'bg-black/40 backdrop-blur-md text-white/90',
                'border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.2)]',
                'hover:bg-black/60 hover:text-white hover:scale-110 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]',
                'transition-all duration-300 ease-out',
                'focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2',
                'flex items-center justify-center'
              )}
            >
              {isDesktopCollapsed ? (
                <ChevronsRight className="h-3.5 w-3.5 stroke-[3] transition-transform duration-300 group-hover:translate-x-0.5" />
              ) : (
                <ChevronsLeft className="h-3.5 w-3.5 stroke-[3] transition-transform duration-300 group-hover:-translate-x-0.5" />
              )}
            </Button>
          )}

          {/* Mobile Close Button */}
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

        {/* Compact Footer Redesign */}
        <div
          className={cn(
            'mt-auto shrink-0 border-t border-white/5',
            // Removed bg-black/20 to match sidebar theme seamlessly
            isDesktopCollapsed ? 'p-2' : 'p-3'
          )}
        >
          {/* User Profile Row */}
          <div
            className={cn(
              'flex items-center gap-3 group',
              isDesktopCollapsed ? 'justify-center' : ''
            )}
          >
            <div className="relative shrink-0">
              <Avatar
                className={cn(
                  'border border-white/10 shadow-sm transition-transform group-hover:scale-105',
                  isDesktopCollapsed ? 'w-8 h-8' : 'w-9 h-9'
                )}
              >
                <AvatarImage
                  src={currentAvatar || getDefaultAvatar(currentGender, userId)}
                  alt={currentName || 'User'}
                />
                <AvatarFallback className="bg-indigo-500/20 text-indigo-200 text-[10px] font-bold uppercase backdrop-blur-md">
                  {(currentName || currentEmail || 'U').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0B1120]" />
            </div>

            {!isDesktopCollapsed && (
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="text-xs font-bold text-white truncate group-hover:text-indigo-200 transition-colors flex items-center gap-2">
                  <span>{currentName || 'User'}</span>
                  {(() => {
                    const roleKey = (currentRole?.toLowerCase() || 'admin') as
                      | 'admin'
                      | 'responder'
                      | 'observer'
                      | 'user';

                    return (
                      <Badge
                        variant={
                          roleKey === 'admin'
                            ? 'danger'
                            : roleKey === 'responder'
                              ? 'info'
                              : roleKey === 'observer'
                                ? 'success'
                                : 'neutral'
                        }
                        size="xs"
                        className="uppercase"
                      >
                        {currentRole?.toLowerCase() || 'admin'}
                      </Badge>
                    );
                  })()}
                </div>
                <div className="text-[10px] text-white/40 font-medium truncate">
                  {/* Display Email as requested */}
                  {currentEmail || 'user@example.com'}
                </div>
              </div>
            )}
          </div>

          {/* Action Bar */}
          {!isDesktopCollapsed && (
            <div className="grid grid-cols-4 gap-1 mt-3">
              <Link
                href="/docs"
                className="flex items-center justify-center h-8 rounded-md hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                title="Documentation"
              >
                <HelpCircle className="h-4 w-4" />
              </Link>
              <Link
                href="/shortcuts"
                className="flex items-center justify-center h-8 rounded-md hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                title="Keyboard Shortcuts"
              >
                <Keyboard className="h-4 w-4" />
              </Link>
              <Link
                href="/settings"
                className="flex items-center justify-center h-8 rounded-md hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <a
                href="/api/auth/logout"
                className="flex items-center justify-center h-8 rounded-md hover:bg-rose-500/10 text-white/40 hover:text-rose-400 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </a>
            </div>
          )}

          {/* Collapsed Sign Out */}
          {isDesktopCollapsed && (
            <div className="mt-2 flex flex-col gap-1 items-center">
              <div className="h-px w-4 bg-white/10 my-1" />
              <a
                href="/api/auth/logout"
                className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-rose-500/10 text-white/40 hover:text-rose-400 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </a>
            </div>
          )}

          {/* Footer Metadata */}
          {!isDesktopCollapsed && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
              <span className="text-[10px] text-white/20 font-medium hover:text-white/40 transition-colors cursor-default">
                opssentinal.com
              </span>
              <span className="text-[10px] text-white/10 font-mono">v1.0.2</span>
            </div>
          )}
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
