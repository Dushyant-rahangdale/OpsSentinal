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

export default function TopbarUserMenu({ name, role, email }: Props) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const initials = useMemo(() => getInitials(name, email), [name, email]);
    const displayName = name?.trim() || email || 'Unknown User';
    const userEmail = email?.trim() || null;

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
        <div className="topbar-menu" ref={rootRef}>
            <button
                className="user-pill"
                type="button"
                aria-label="User menu"
                aria-expanded={open}
                onClick={() => setOpen((prev) => !prev)}
            >
                <span className="user-avatar">{initials}</span>
                <span className="user-meta">
                    <span className="user-name">{displayName}</span>
                    <span className="user-role">{formatRole(role)}</span>
                </span>
                <span className="user-caret">v</span>
            </button>
            {open && (
                <div className="topbar-dropdown" role="menu" aria-label="User menu">
                    <div className="topbar-dropdown-title">Account</div>
                    <div className="topbar-dropdown-meta">{userEmail || 'No email on file'}</div>
                    <div className="topbar-dropdown-list">
                        <Link className="topbar-dropdown-item" href="/settings/profile">
                            Profile
                        </Link>
                        <Link className="topbar-dropdown-item" href="/settings/preferences">
                            Preferences
                        </Link>
                        <Link className="topbar-dropdown-item" href="/settings/security">
                            Security
                        </Link>
                        <Link className="topbar-dropdown-item" href="/settings/api-keys">
                            API keys
                        </Link>
                        <Link className="topbar-dropdown-item" href="/help">
                            Help and docs
                        </Link>
                    </div>
                    <div className="topbar-dropdown-divider" />
                    <button
                        type="button"
                        className="topbar-dropdown-action"
                        onClick={() => signOut({ callbackUrl: '/login' })}
                    >
                        Sign out
                    </button>
                </div>
            )}
        </div>
    );
}
