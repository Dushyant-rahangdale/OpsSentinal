'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

type Props = {
    name?: string | null;
    role?: string | null;
    email?: string | null;
};

function getInitials(name?: string | null, email?: string | null) {
    const base = name?.trim() || email?.trim() || '';
    if (!base) return 'U';
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatRole(role?: string | null) {
    if (!role) return 'User';
    return role[0] + role.slice(1).toLowerCase();
}

function getRoleColor(role?: string | null) {
    switch (role?.toUpperCase()) {
        case 'ADMIN':
            return { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' };
        case 'RESPONDER':
            return { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' };
        default:
            return { bg: '#f3f4f6', text: '#4b5563', border: '#9ca3af' };
    }
}

export default function TopbarUserMenu({ name, role, email }: Props) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const initials = useMemo(() => getInitials(name, email), [name, email]);
    const displayName = name?.trim() || email || 'Unknown User';
    const userEmail = email?.trim() || null;
    const roleColor = getRoleColor(role);

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            if (!rootRef.current) return;
            if (rootRef.current.contains(event.target as Node)) return;
            setOpen(false);
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    return (
        <div className="user-menu-container" ref={rootRef}>
            <button
                className="user-menu-trigger"
                type="button"
                aria-label="User menu"
                aria-expanded={open}
                onClick={() => setOpen((prev) => !prev)}
            >
                <div className="user-avatar-new">
                    {initials}
                </div>
                <div className="user-info">
                    <span className="user-name-new">{displayName}</span>
                    <span className="user-role-badge" style={{
                        background: roleColor.bg,
                        color: roleColor.text,
                        borderColor: roleColor.border
                    }}>
                        {formatRole(role)}
                    </span>
                </div>
                <svg 
                    className={`user-menu-chevron ${open ? 'open' : ''}`}
                    width="16" 
                    height="16" 
                    viewBox="0 0 16 16" 
                    fill="none"
                >
                    <path 
                        d="M4 6L8 10L12 6" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                    />
                </svg>
            </button>
            {open && (
                <div className="user-menu-dropdown" role="menu" aria-label="User menu">
                    {/* User Info Header */}
                    <div className="user-menu-header">
                        <div className="user-menu-avatar-large">
                            {initials}
                        </div>
                        <div className="user-menu-details">
                            <div className="user-menu-name">{displayName}</div>
                            <div className="user-menu-email">{userEmail || 'No email'}</div>
                            <div className="user-menu-role-tag" style={{
                                background: roleColor.bg,
                                color: roleColor.text,
                                borderColor: roleColor.border
                            }}>
                                {formatRole(role)}
                            </div>
                        </div>
                    </div>

                    <div className="user-menu-divider" />

                    {/* Quick Actions */}
                    <div className="user-menu-section">
                        <Link 
                            className="user-menu-item" 
                            href="/settings"
                            onClick={() => setOpen(false)}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 0L0 4V8C0 12.4183 3.58172 16 8 16C12.4183 16 16 12.4183 16 8V4L8 0Z" fill="currentColor" fillOpacity="0.6"/>
                                <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" fill="currentColor"/>
                            </svg>
                            <span>Settings</span>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 'auto', opacity: 0.4 }}>
                                <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </Link>
                        <Link 
                            className="user-menu-item" 
                            href="/help"
                            onClick={() => setOpen(false)}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0ZM8 12C7.44772 12 7 11.5523 7 11C7 10.4477 7.44772 10 8 10C8.55228 10 9 10.4477 9 11C9 11.5523 8.55228 12 8 12ZM9 8C9 8.55228 8.55228 9 9 9C9.55228 9 10 8.55228 10 8C10 6.34315 8.65685 5 7 5C5.34315 5 4 6.34315 4 8H5C5 7.44772 5.44772 7 6 7C6.55228 7 7 7.44772 7 8V9H9V8Z" fill="currentColor" fillOpacity="0.6"/>
                            </svg>
                            <span>Help & Support</span>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 'auto', opacity: 0.4 }}>
                                <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </Link>
                    </div>

                    <div className="user-menu-divider" />

                    {/* Sign Out */}
                    <div className="user-menu-section">
                        <button
                            type="button"
                            className="user-menu-item user-menu-item-danger"
                            onClick={() => {
                                setOpen(false);
                                signOut({ callbackUrl: '/login' });
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M6 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M10 11L13 8L10 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>Sign out</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
