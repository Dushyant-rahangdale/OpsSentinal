'use client';

import { useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/timezone';

interface StatusPageHeaderProps {
    statusPage: {
        name: string;
        contactEmail?: string | null;
        contactUrl?: string | null;
    };
    overallStatus: 'operational' | 'degraded' | 'outage';
    branding?: any;
    lastUpdated?: string;
}

const STATUS_CONFIG = {
    operational: {
        badge: 'Operational',
        text: 'All systems operational',
        color: '#16a34a',
        background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
        border: '#86efac',
        pulse: true,
    },
    degraded: {
        badge: 'Degraded',
        text: 'Some systems experiencing issues',
        color: '#d97706',
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        border: '#fcd34d',
        pulse: true,
    },
    outage: {
        badge: 'Outage',
        text: 'Some systems are down',
        color: '#dc2626',
        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
        border: '#fca5a5',
        pulse: true,
    },
};

export default function StatusPageHeader({ statusPage, overallStatus, branding = {}, lastUpdated }: StatusPageHeaderProps) {
    const status = STATUS_CONFIG[overallStatus];
    const logoUrl = branding.logoUrl;
    const primaryColor = branding.primaryColor || '#667eea';
    const textColor = branding.textColor || '#111827';
    const [updatedLabel, setUpdatedLabel] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    useEffect(() => {
        if (!lastUpdated) {
            setUpdatedLabel(null);
            return;
        }

        const parsed = new Date(lastUpdated);
        if (Number.isNaN(parsed.getTime())) {
            setUpdatedLabel(null);
            return;
        }

        const updateLabel = () => {
            const now = new Date();
            const diff = now.getTime() - parsed.getTime();
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);

            if (seconds < 60) {
                setUpdatedLabel('just now');
            } else if (minutes < 60) {
                setUpdatedLabel(`${minutes} minute${minutes !== 1 ? 's' : ''} ago`);
            } else if (hours < 24) {
                setUpdatedLabel(`${hours} hour${hours !== 1 ? 's' : ''} ago`);
            } else {
                // Use browser timezone for public status page
                const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const label = formatDateTime(parsed, browserTz, {
                    format: 'short',
                    hour12: true
                });
                setUpdatedLabel(label);
            }
        };

        updateLabel();
        const interval = setInterval(updateLabel, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [lastUpdated]);

    return (
        <header
            className="status-page-header"
            style={{
                background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                borderBottom: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                transition: 'all 0.3s ease',
            }}
        >
            <div style={{
                width: '100%',
                maxWidth: '1400px',
                margin: '0 auto',
                padding: 'clamp(0.5rem, 2vw, 1.5rem) clamp(0.5rem, 2vw, 1.5rem)',
                boxSizing: 'border-box'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 'clamp(0.5rem, 1.5vw, 1rem)', // Reduce gap
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'translateY(0)' : 'translateY(-10px)',
                    transition: 'opacity 0.5s ease, transform 0.5s ease',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'clamp(0.5rem, 1.5vw, 1rem)', // Reduce gap
                        flex: '1 1 auto', // Allow it to shrink
                        minWidth: 0,
                        flexWrap: 'wrap',
                        justifyContent: 'flex-start',
                    }}>
                        {logoUrl && (
                            <div style={{
                                flexShrink: 0,
                                padding: 'clamp(0.25rem, 1vw, 0.5rem)',
                                borderRadius: '0.5rem', // Smaller radius
                                background: '#ffffff',
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                                }}
                            >
                                <img
                                    src={logoUrl}
                                    alt={statusPage.name}
                                    style={{
                                        height: 'clamp(24px, 4vw, 40px)', // Smaller logo
                                        maxWidth: 'clamp(80px, 20vw, 180px)',
                                        objectFit: 'contain',
                                        display: 'block',
                                    }}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </div>
                        )}
                        <div style={{ textAlign: 'left', flex: '1 1 auto', minWidth: 0 }}>
                            <h1 style={{
                                fontSize: 'clamp(1rem, 4vw, 2.25rem)', // Smaller title
                                fontWeight: '800',
                                margin: 0,
                                color: textColor,
                                letterSpacing: '-0.03em',
                                background: `linear-gradient(135deg, ${textColor} 0%, ${textColor}dd 100%)`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                lineHeight: '1.2',
                                wordBreak: 'break-word',
                            }}>
                                {statusPage.name}
                            </h1>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'clamp(0.375rem, 1.5vw, 0.75rem)',
                                marginTop: 'clamp(0.125rem, 0.5vw, 0.25rem)', // Tighter margin
                                flexWrap: 'wrap',
                            }}>
                                <p style={{
                                    margin: 0,
                                    color: '#475569',
                                    fontSize: 'clamp(0.75rem, 2vw, 0.95rem)', // Smaller subtitle
                                    fontWeight: '500',
                                }}>
                                    {status.text}
                                </p>
                                {updatedLabel && (
                                    <>
                                        <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>|</span>
                                        <p
                                            suppressHydrationWarning
                                            style={{
                                                margin: 0,
                                                color: '#94a3b8',
                                                fontSize: '0.75rem', // Smaller text
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                            }}
                                        >
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <polyline points="12 6 12 12 16 14"></polyline>
                                            </svg>
                                            {updatedLabel}
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexShrink: 0,
                        flex: '0 0 auto', // Don't grow if not needed
                        justifyContent: 'flex-end',
                        marginTop: '0', // Removing top margin relying on flex wrap gap
                    }}>
                        <div style={{
                            position: 'relative',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}>
                            <span style={{
                                padding: '0.375rem 0.75rem', // Smaller padding
                                background: status.background,
                                color: status.color,
                                border: `1px solid ${status.border}`, // Thinner border
                                borderRadius: '999px',
                                fontSize: '0.7rem', // Smaller font
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                boxShadow: `0 1px 2px ${status.border}40`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                position: 'relative',
                                transition: 'all 0.2s ease',
                            }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                    e.currentTarget.style.boxShadow = `0 4px 12px ${status.border}60`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = `0 1px 2px ${status.border}40`;
                                }}
                            >
                                {status.badge}
                            </span>
                        </div>
                        {(statusPage.contactEmail || statusPage.contactUrl) && (
                            <a
                                href={statusPage.contactUrl || `mailto:${statusPage.contactEmail}`}
                                style={{
                                    padding: '0.625rem 1.25rem',
                                    borderRadius: '0.625rem',
                                    border: `2px solid ${primaryColor}`,
                                    background: 'transparent',
                                    color: primaryColor,
                                    textDecoration: 'none',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    transition: 'all 0.2s ease',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = primaryColor;
                                    e.currentTarget.style.color = '#ffffff';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = `0 4px 12px ${primaryColor}40`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = primaryColor;
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    <polyline points="22,6 12,13 2,6"></polyline>
                                </svg>
                                Contact
                            </a>
                        )}
                    </div>
                </div>
            </div>
            <style jsx>{`
                @keyframes pulse {
                    0%, 100% {
                        opacity: 0.6;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1.2);
                    }
                }
            `}</style>
        </header>
    );
}
