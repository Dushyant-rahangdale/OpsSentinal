'use client';

import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useModalState } from '@/hooks/useModalState';

type QuickAction = {
    label: string;
    href: string;
    icon: React.ReactNode;
    description?: string;
};

const quickActions: QuickAction[] = [
    {
        label: 'New Incident',
        href: '/incidents/create',
        description: 'Create a new incident',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3 2.5 20h19L12 3Zm0 6 4.5 9h-9L12 9Zm0 3v4" strokeLinecap="round" />
            </svg>
        )
    },
    {
        label: 'New Postmortem',
        href: '/postmortems/create',
        description: 'Create postmortem for resolved incident',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 13H8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 17H8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )
    },
    {
        label: 'New Service',
        href: '/services',
        description: 'Add a new service',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M4 6h16v5H4V6Zm0 7h16v5H4v-5Z" />
            </svg>
        )
    },
    {
        label: 'New Team',
        href: '/teams',
        description: 'Create a new team',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M7 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm10 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM3 19a4 4 0 0 1 8 0v1H3v-1Zm10 1v-1a4 4 0 0 1 8 0v1h-8Z" />
            </svg>
        )
    },
    {
        label: 'New Schedule',
        href: '/schedules',
        description: 'Set up on-call schedule',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 3v3m10-3v3M4 9h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Z" strokeLinecap="round" />
            </svg>
        )
    },
    {
        label: 'New Policy',
        href: '/policies',
        description: 'Create escalation policy',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5Z" />
            </svg>
        )
    }
];

export default function QuickActions() {
    const [isOpen, setIsOpen] = useModalState('quickActions');
    const router = useRouter();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('keydown', handleEscape);
            };
        }
    }, [isOpen]);

    const handleActionClick = (href: string) => {
        router.push(href);
        setIsOpen(false);
    };

    return (
        <div ref={menuRef} className="quick-actions-container">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`quick-actions-trigger ${isOpen ? 'active' : ''}`}
                aria-label="Quick actions"
                aria-expanded={isOpen}
            >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span className="quick-actions-label">Create</span>
                <svg 
                    className="quick-actions-chevron"
                    viewBox="0 0 24 24" 
                    width="14" 
                    height="14" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {isOpen && (
                <>
                    <div
                        className="quick-actions-overlay"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="quick-actions-menu">
                        <div className="quick-actions-header">
                            <h3>Quick Actions</h3>
                            <p>Create new resources quickly</p>
                        </div>
                        <div className="quick-actions-list">
                            {quickActions.map((action) => (
                                <button
                                    key={action.href}
                                    type="button"
                                    onClick={() => handleActionClick(action.href)}
                                    className="quick-actions-item"
                                >
                                    <div className="quick-actions-item-icon">
                                        {action.icon}
                                    </div>
                                    <div className="quick-actions-item-content">
                                        <span className="quick-actions-item-label">{action.label}</span>
                                        {action.description && (
                                            <span className="quick-actions-item-desc">{action.description}</span>
                                        )}
                                    </div>
                                    <svg 
                                        className="quick-actions-item-arrow"
                                        width="16" 
                                        height="16" 
                                        viewBox="0 0 16 16" 
                                        fill="none"
                                    >
                                        <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
