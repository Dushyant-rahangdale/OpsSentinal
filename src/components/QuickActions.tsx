'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type QuickAction = {
    label: string;
    href: string;
    icon: React.ReactNode;
};

const quickActions: QuickAction[] = [
    {
        label: 'New Incident',
        href: '/incidents/create',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3 2.5 20h19L12 3Zm0 6 4.5 9h-9L12 9Zm0 3v4" strokeLinecap="round" />
            </svg>
        )
    },
    {
        label: 'New Service',
        href: '/services',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M4 6h16v5H4V6Zm0 7h16v5H4v-5Z" />
            </svg>
        )
    },
    {
        label: 'New Team',
        href: '/teams',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M7 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm10 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM3 19a4 4 0 0 1 8 0v1H3v-1Zm10 1v-1a4 4 0 0 1 8 0v1h-8Z" />
            </svg>
        )
    },
    {
        label: 'New Schedule',
        href: '/schedules',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 3v3m10-3v3M4 9h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Z" strokeLinecap="round" />
            </svg>
        )
    },
    {
        label: 'New Policy',
        href: '/policies',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5Z" />
            </svg>
        )
    }
];

export default function QuickActions() {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const handleActionClick = (href: string) => {
        router.push(href);
        setIsOpen(false);
    };

    return (
        <div ref={menuRef} style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    padding: '0.625rem 1rem',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0px',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                }}
            >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span style={{ display: 'none' }}>Quick Actions</span>
                <svg 
                    viewBox="0 0 24 24" 
                    width="14" 
                    height="14" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        marginLeft: 'auto'
                    }}
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {isOpen && (
                <>
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 9998
                        }}
                        onClick={() => setIsOpen(false)}
                    />
                    <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 0.5rem)',
                        right: 0,
                        minWidth: '200px',
                        width: 'max-content',
                        background: 'white',
                        borderRadius: '0px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                        border: '1px solid rgba(0,0,0,0.1)',
                        zIndex: 9999,
                        overflow: 'hidden'
                    }}>
                        {quickActions.map((action, index) => (
                            <button
                                key={action.href}
                                onClick={() => handleActionClick(action.href)}
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    background: 'transparent',
                                    border: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    transition: 'background 0.15s',
                                    borderBottom: index < quickActions.length - 1 ? '1px solid #e5e7eb' : 'none',
                                    whiteSpace: 'nowrap'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#f3f4f6';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <span style={{ color: 'var(--primary)', flexShrink: 0 }}>
                                    {action.icon}
                                </span>
                                <span style={{
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    color: 'var(--text-primary)'
                                }}>
                                    {action.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
