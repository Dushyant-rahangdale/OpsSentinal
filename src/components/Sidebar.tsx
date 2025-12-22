'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import KeyboardShortcuts from './KeyboardShortcuts';
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
        )
    },
    {
        href: '/incidents',
        label: 'Incidents',
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3 2.5 20h19L12 3Zm0 6 4.5 9h-9L12 9Zm0 3v4" strokeLinecap="round" />
            </svg>
        )
    },
    {
        href: '/services',
        label: 'Services',
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                <path d="M4 6h16v5H4V6Zm0 7h16v5H4v-5Z" />
            </svg>
        )
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
        section: 'OPERATIONS'
    },
    {
        href: '/users',
        label: 'Users',
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 20a6 6 0 0 1 16 0v1H4v-1Z" />
            </svg>
        ),
        section: 'OPERATIONS'
    },
    {
        href: '/schedules',
        label: 'Schedules',
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 3v3m10-3v3M4 9h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Z" strokeLinecap="round" />
            </svg>
        ),
        section: 'OPERATIONS'
    },
    {
        href: '/policies',
        label: 'Escalation Policies',
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5Z" />
            </svg>
        ),
        section: 'OPERATIONS'
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
        section: 'INSIGHTS'
    },
    {
        href: '/postmortems',
        label: 'Postmortems',
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        section: 'INSIGHTS'
    },
    {
        href: '/status',
        label: 'Status Page',
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        section: 'INSIGHTS'
    },
    {
        href: '/action-items',
        label: 'Action Items',
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        section: 'INSIGHTS'
    },
    {
        href: '/events',
        label: 'Event Logs',
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                <path d="M5 4h14v4H5V4Zm0 6h14v4H5v-4Zm0 6h14v4H5v-4Z" />
            </svg>
        ),
        section: 'INSIGHTS'
    },
    {
        href: '/audit',
        label: 'Audit Log',
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                <path d="M6 4h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm8 1.5V8h2.5L14 5.5ZM8 11h8v2H8v-2Zm0 4h8v2H8v-2Z" />
            </svg>
        ),
        section: 'INSIGHTS'
    }
];

export default function Sidebar() {
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

    // Group items by section
    const groupedItems = navigationItems.reduce((acc, item) => {
        const section = item.section || 'MAIN';
        if (!acc[section]) {
            acc[section] = [];
        }
        acc[section].push(item);
        return acc;
    }, {} as Record<string, NavItem[]>);

    const renderNavItem = (item: NavItem) => {
        const active = isActive(item.href);
        const showBadge = item.href === '/incidents' && activeIncidentsCount !== null && activeIncidentsCount > 0;
        
        return (
            <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${active ? 'active' : ''}`}
                style={{
                    padding: '0.875rem 1rem',
                    textDecoration: 'none',
                    fontWeight: active ? '600' : '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.875rem',
                    borderRadius: 'var(--radius-sm)',
                    color: active ? 'var(--primary)' : 'rgba(255,255,255,0.85)',
                    background: active ? 'rgba(255,255,255,0.95)' : 'transparent',
                    boxShadow: active ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    borderLeft: active ? '4px solid var(--accent)' : '4px solid transparent',
                    borderRight: 'none',
                    borderTop: 'none',
                    borderBottom: 'none'
                }}
                onMouseEnter={(e) => {
                    if (!active) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.95)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (!active) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                    }
                }}
            >
                <span 
                    className="nav-icon" 
                    style={{ 
                        width: '22px', 
                        height: '22px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flexShrink: 0,
                        opacity: active ? 1 : 0.9,
                        position: 'relative'
                    }}
                >
                    {item.icon}
                </span>
                <span style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', flex: 1 }}>{item.label}</span>
                {showBadge && (
                    <span 
                        aria-label={`${activeIncidentsCount} active incidents`}
                        style={{
                        minWidth: '20px',
                        height: '20px',
                        padding: '0 6px',
                        background: '#ef4444',
                        color: 'white',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        borderRadius: 'var(--radius-full)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                        {activeIncidentsCount > 99 ? '99+' : activeIncidentsCount}
                    </span>
                )}
            </Link>
        );
    };

    const renderSection = (sectionName: string, items: NavItem[]) => {
        return (
            <div key={sectionName} style={{ marginBottom: sectionName !== 'MAIN' ? '1.5rem' : '0' }}>
                {sectionName !== 'MAIN' && (
                    <div style={{
                        marginTop: '1.75rem',
                        marginBottom: '0.75rem',
                        paddingLeft: '1rem',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        color: 'rgba(255,255,255,0.4)',
                        letterSpacing: '1.2px',
                        textTransform: 'uppercase'
                    }}>
                        {sectionName}
                    </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {items.map(renderNavItem)}
                </div>
            </div>
        );
    };

    // Mobile menu button
    const MobileMenuButton = () => (
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
                transition: 'all var(--transition-base)'
            }}
        >
            {isMobileMenuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
            )}
        </button>
    );

    // Mobile backdrop
    const MobileBackdrop = () => (
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
                    animation: 'fadeIn var(--transition-base)'
                }}
                aria-hidden="true"
            />
        ) : null
    );

    return (
        <>
            <MobileMenuButton />
            <MobileBackdrop />
            <aside 
                className={`sidebar ${isMobile ? 'sidebar-mobile' : ''} ${isMobileMenuOpen ? 'sidebar-mobile-open' : ''}`}
                style={{
                    width: isMobile ? '280px' : 'var(--sidebar-width)',
                    background: 'var(--gradient-primary)',
                    borderRight: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100vh',
                    position: isMobile ? 'fixed' : 'sticky',
                    top: 0,
                    left: isMobile ? (isMobileMenuOpen ? 0 : '-280px') : 0,
                    color: 'white',
                    boxShadow: '4px 0 24px rgba(211, 47, 47, 0.15)',
                    overflow: 'hidden',
                    zIndex: 1000,
                    transition: isMobile ? 'left var(--transition-slow) var(--ease-out)' : 'none',
                    transform: isMobile && !isMobileMenuOpen ? 'translateX(-100%)' : 'translateX(0)'
                }}
                aria-label="Main navigation"
            >
            {/* Branding Header - Fixed */}
            <div style={{ 
                padding: '1.5rem',
                paddingBottom: '1rem',
                flexShrink: 0,
                borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
                <Link href="/" style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        {/* Logo */}
                        <div style={{
                            width: '44px',
                            height: '44px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255,255,255,0.15)',
                            borderRadius: 'var(--radius-md)',
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                            flexShrink: 0
                        }}>
                            <img
                                src="/logo.svg"
                                alt="OpsGuard Shield"
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    objectFit: 'contain'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <h1 style={{
                                fontSize: '1.35rem',
                                fontWeight: '800',
                                color: 'white',
                                letterSpacing: '-0.5px',
                                margin: 0,
                                lineHeight: '1.2',
                                textShadow: '0 2px 4px rgba(0,0,0,0.15)'
                            }}>OpsGuard</h1>
                            <span style={{
                                fontSize: '0.65rem',
                                opacity: 0.9,
                                fontWeight: '600',
                                letterSpacing: '1.2px',
                                background: 'rgba(255,255,255,0.2)',
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-sm)',
                                width: 'fit-content',
                                marginTop: '3px'
                            }}>ENTERPRISE</span>
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
                    padding: '1rem 0 1.5rem 0',
                    gap: '0.5rem'
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
                        transition: 'all var(--transition-base)'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            )}

            {/* Useful Footer - Quick Links & Help */}
            <div style={{
                padding: '1rem 1.5rem',
                background: 'rgba(0,0,0,0.2)',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.9)',
                flexShrink: 0
            }}>
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '0.75rem'
                }}>
                    <Link 
                        href="/help"
                        onClick={() => isMobile && setIsMobileMenuOpen(false)}
                        aria-label="Help and documentation"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'rgba(255,255,255,0.85)',
                            textDecoration: 'none',
                            fontWeight: '500',
                            transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,1)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.85)'}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3m0 4h.01" />
                        </svg>
                        <span>Help & Documentation</span>
                    </Link>
                    <Link 
                        href="/settings"
                        onClick={() => isMobile && setIsMobileMenuOpen(false)}
                        aria-label="Settings"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'rgba(255,255,255,0.85)',
                            textDecoration: 'none',
                            fontWeight: '500',
                            transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,1)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.85)'}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
                        </svg>
                        <span>Settings</span>
                    </Link>
                    <button
                        onClick={() => {
                            // Trigger keyboard shortcut modal via custom event
                            window.dispatchEvent(new CustomEvent('toggleKeyboardShortcuts'));
                            if (isMobile) setIsMobileMenuOpen(false);
                        }}
                        aria-label="Show keyboard shortcuts"
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'rgba(255,255,255,0.85)',
                            textDecoration: 'none',
                            fontWeight: '500',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0.5rem 0',
                            transition: 'color 0.2s',
                            fontSize: '0.75rem'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,1)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.85)'}
                    >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="4" y="2" width="16" height="20" rx="2" />
                            <path d="M9 6h6m-6 4h6m-2 4h2" />
                        </svg>
                        <span>Keyboard Shortcuts</span>
                    </button>
                </div>
            </div>

        </aside>
        </>
    );
}
