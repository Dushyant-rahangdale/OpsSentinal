'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
    const pathname = usePathname();

    const isActive = (path: string) => {
        if (path === '/' && pathname === '/') return true;
        if (path !== '/' && pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <aside className="sidebar" style={{
            width: 'var(--sidebar-width)',
            background: 'var(--gradient-primary)',
            borderRight: 'none',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            position: 'sticky',
            top: 0,
            color: 'white',
            boxShadow: '4px 0 24px rgba(211, 47, 47, 0.15)'
        }}>
            {/* Branding Header - Improved Structure */}
            <Link href="/" style={{ textDecoration: 'none', marginBottom: '3rem', display: 'block' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Logo - OpsGuard Shield */}
                    <div style={{
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
                        animation: 'pulse-red 4s infinite ease-in-out'
                    }}>
                        <img
                            src="/logo.svg"
                            alt="OpsGuard Shield"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h1 style={{
                            fontSize: '1.5rem',
                            fontWeight: '800',
                            color: 'white',
                            letterSpacing: '-0.5px',
                            margin: 0,
                            lineHeight: '1',
                            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>OpsGuard</h1>
                        <span style={{
                            fontSize: '0.7rem',
                            opacity: 0.9,
                            fontWeight: '600',
                            letterSpacing: '1.5px',
                            background: 'rgba(255,255,255,0.2)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            width: 'fit-content',
                            marginTop: '4px'
                        }}>ENTERPRISE</span>
                    </div>
                </div>
            </Link>

            {/* Navigation Links */}
            <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Link href="/" className={`nav-item ${isActive('/') ? 'active' : ''}`} style={{
                    padding: '0.85rem 1rem',
                    textDecoration: 'none',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    borderRadius: '8px',
                    color: isActive('/') ? 'var(--primary)' : 'rgba(255,255,255,0.9)',
                    background: isActive('/') ? 'white' : 'transparent',
                    boxShadow: isActive('/') ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s ease'
                }}>
                    <span className="nav-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" fill="currentColor" />
                        </svg>
                    </span>
                    Dashboard
                </Link>
                <Link href="/incidents" className={`nav-item ${isActive('/incidents') ? 'active' : ''}`} style={{
                    padding: '0.85rem 1rem',
                    textDecoration: 'none',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    borderRadius: '8px',
                    color: isActive('/incidents') ? 'var(--primary)' : 'rgba(255,255,255,0.9)',
                    background: isActive('/incidents') ? 'white' : 'transparent',
                    boxShadow: isActive('/incidents') ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s ease'
                }}>
                    <span className="nav-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 3 2.5 20h19L12 3Zm0 6 4.5 9h-9L12 9Zm0 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </span>
                    Incidents
                </Link>
                <Link href="/services" className={`nav-item ${isActive('/services') ? 'active' : ''}`} style={{
                    padding: '0.85rem 1rem',
                    textDecoration: 'none',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    borderRadius: '8px',
                    color: isActive('/services') ? 'var(--primary)' : 'rgba(255,255,255,0.9)',
                    background: isActive('/services') ? 'white' : 'transparent',
                    boxShadow: isActive('/services') ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s ease'
                }}>
                    <span className="nav-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 6h16v5H4V6Zm0 7h16v5H4v-5Z" fill="currentColor" />
                        </svg>
                    </span>
                    Services
                </Link>

                <div style={{ marginTop: '1.5rem', marginBottom: '0.5rem', paddingLeft: '1rem', fontSize: '0.75rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px' }}>
                    OPERATIONS
                </div>

                <Link href="/teams" className={`nav-item ${isActive('/teams') ? 'active' : ''}`} style={{
                    padding: '0.85rem 1rem',
                    textDecoration: 'none',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    borderRadius: '8px',
                    color: isActive('/teams') ? 'var(--primary)' : 'rgba(255,255,255,0.9)',
                    background: isActive('/teams') ? 'white' : 'transparent',
                    boxShadow: isActive('/teams') ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s ease'
                }}>
                    <span className="nav-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M7 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm10 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM3 19a4 4 0 0 1 8 0v1H3v-1Zm10 1v-1a4 4 0 0 1 8 0v1h-8Z" fill="currentColor" />
                        </svg>
                    </span>
                    Teams
                </Link>
                <Link href="/users" className={`nav-item ${isActive('/users') ? 'active' : ''}`} style={{
                    padding: '0.85rem 1rem',
                    textDecoration: 'none',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    borderRadius: '8px',
                    color: isActive('/users') ? 'var(--primary)' : 'rgba(255,255,255,0.9)',
                    background: isActive('/users') ? 'white' : 'transparent',
                    boxShadow: isActive('/users') ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s ease'
                }}>
                    <span className="nav-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 20a6 6 0 0 1 16 0v1H4v-1Z" fill="currentColor" />
                        </svg>
                    </span>
                    Users
                </Link>
                <Link href="/schedules" className={`nav-item ${isActive('/schedules') ? 'active' : ''}`} style={{
                    padding: '0.85rem 1rem',
                    textDecoration: 'none',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    borderRadius: '8px',
                    color: isActive('/schedules') ? 'var(--primary)' : 'rgba(255,255,255,0.9)',
                    background: isActive('/schedules') ? 'white' : 'transparent',
                    boxShadow: isActive('/schedules') ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s ease'
                }}>
                    <span className="nav-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M7 3v3m10-3v3M4 9h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </span>
                    Schedules
                </Link>

                <div style={{ marginTop: '1.5rem', marginBottom: '0.5rem', paddingLeft: '1rem', fontSize: '0.75rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px' }}>
                    INSIGHTS
                </div>

                <Link href="/analytics" className={`nav-item ${isActive('/analytics') ? 'active' : ''}`} style={{
                    padding: '0.85rem 1rem',
                    textDecoration: 'none',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    borderRadius: '8px',
                    color: isActive('/analytics') ? 'var(--primary)' : 'rgba(255,255,255,0.9)',
                    background: isActive('/analytics') ? 'white' : 'transparent',
                    boxShadow: isActive('/analytics') ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s ease'
                }}>
                    <span className="nav-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M5 20V10m7 10V4m7 16v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </span>
                    Analytics
                </Link>
                <Link href="/events" className={`nav-item ${isActive('/events') ? 'active' : ''}`} style={{
                    padding: '0.85rem 1rem',
                    textDecoration: 'none',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    borderRadius: '8px',
                    color: isActive('/events') ? 'var(--primary)' : 'rgba(255,255,255,0.9)',
                    background: isActive('/events') ? 'white' : 'transparent',
                    boxShadow: isActive('/events') ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s ease'
                }}>
                    <span className="nav-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M5 4h14v4H5V4Zm0 6h14v4H5v-4Zm0 6h14v4H5v-4Z" fill="currentColor" />
                        </svg>
                    </span>
                    Event Logs
                </Link>
                <Link href="/audit" className={`nav-item ${isActive('/audit') ? 'active' : ''}`} style={{
                    padding: '0.85rem 1rem',
                    textDecoration: 'none',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    borderRadius: '8px',
                    color: isActive('/audit') ? 'var(--primary)' : 'rgba(255,255,255,0.9)',
                    background: isActive('/audit') ? 'white' : 'transparent',
                    boxShadow: isActive('/audit') ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s ease'
                }}>
                    <span className="nav-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M6 4h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm8 1.5V8h2.5L14 5.5ZM8 11h8v2H8v-2Zm0 4h8v2H8v-2Z" fill="currentColor" />
                        </svg>
                    </span>
                    Audit Log
                </Link>
            </nav>

            {/* User Footer */}
            <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '0.8rem', color: 'white' }}>
                <strong style={{ display: 'block', marginBottom: '0.2rem' }}>Alice DevOps</strong>
                <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>alice@opsguard.com</span>
            </div>
        </aside>
    );
}
