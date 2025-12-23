'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import Button from './Button';

interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: ReactNode;
    action?: {
        label: string;
        href?: string;
        onClick?: () => void;
    };
    image?: ReactNode;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

/**
 * Standardized EmptyState component for consistent empty states across the app
 * 
 * @example
 * <EmptyState
 *   title="No incidents found"
 *   description="Create your first incident to get started"
 *   icon={<IncidentIcon />}
 *   action={{ label: "Create Incident", href: "/incidents/create" }}
 * />
 */
export default function EmptyState({ 
    title, 
    description, 
    icon, 
    action,
    image,
    className = '',
    size = 'md'
}: EmptyStateProps) {
    const sizeStyles = {
        sm: {
            padding: 'var(--spacing-8)',
            iconSize: '48px',
            titleSize: 'var(--font-size-lg)',
            minHeight: '200px'
        },
        md: {
            padding: 'var(--spacing-12)',
            iconSize: '64px',
            titleSize: 'var(--font-size-xl)',
            minHeight: '300px'
        },
        lg: {
            padding: 'var(--spacing-16)',
            iconSize: '80px',
            titleSize: 'var(--font-size-2xl)',
            minHeight: '400px'
        }
    };

    const styles = sizeStyles[size];

    return (
        <div 
            className={`ui-empty-state ${className}`} 
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: styles.padding,
                textAlign: 'center',
                minHeight: styles.minHeight,
            }}
            role="status"
            aria-live="polite"
        >
            {image && (
                <div style={{ marginBottom: 'var(--spacing-6)' }}>
                    {image}
                </div>
            )}
            {icon && !image && (
                <div 
                    className="empty-state-icon"
                    style={{
                        width: styles.iconSize,
                        height: styles.iconSize,
                        marginBottom: 'var(--spacing-4)',
                        opacity: 0.4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: styles.iconSize,
                        color: 'var(--text-muted)'
                    }}
                    aria-hidden="true"
                >
                    {icon}
                </div>
            )}
            <h3 
                className="empty-state-title"
                style={{
                    fontSize: styles.titleSize,
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--text-secondary)',
                    marginBottom: description ? 'var(--spacing-2)' : (action ? 'var(--spacing-4)' : 0),
                }}
            >
                {title}
            </h3>
            {description && (
                <p 
                    className="empty-state-description"
                    style={{
                        fontSize: 'var(--font-size-base)',
                        color: 'var(--text-muted)',
                        maxWidth: '400px',
                        marginBottom: action ? 'var(--spacing-6)' : 0,
                        lineHeight: 'var(--line-height-relaxed)',
                    }}
                >
                    {description}
                </p>
            )}
            {action && (
                <div style={{ marginTop: 'var(--spacing-4)' }}>
                    {action.href ? (
                        <Link href={action.href}>
                            <Button variant="primary" size="md">
                                {action.label}
                            </Button>
                        </Link>
                    ) : (
                        <Button variant="primary" size="md" onClick={action.onClick}>
                            {action.label}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}





