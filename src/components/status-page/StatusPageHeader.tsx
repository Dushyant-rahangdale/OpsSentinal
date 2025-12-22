'use client';

interface StatusPageHeaderProps {
    statusPage: {
        name: string;
        contactEmail?: string | null;
        contactUrl?: string | null;
    };
    overallStatus: 'operational' | 'degraded' | 'outage';
    branding?: any;
}

const STATUS_CONFIG = {
    operational: {
        bg: '#10b981',
        text: 'All systems operational',
        icon: '✓',
    },
    degraded: {
        bg: '#f59e0b',
        text: 'Some systems experiencing issues',
        icon: '⚠',
    },
    outage: {
        bg: '#ef4444',
        text: 'Some systems are down',
        icon: '✕',
    },
};

export default function StatusPageHeader({ statusPage, overallStatus, branding = {} }: StatusPageHeaderProps) {
    const status = STATUS_CONFIG[overallStatus];
    const logoUrl = branding.logoUrl;
    const primaryColor = branding.primaryColor || '#667eea';

    return (
        <header 
            className="status-page-header"
            style={{
                background: 'white',
                borderBottom: '1px solid #e5e7eb',
                padding: '2.5rem 0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
        >
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: '300px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {logoUrl && (
                            <img 
                                src={logoUrl} 
                                alt={statusPage.name}
                                style={{
                                    height: '50px',
                                    maxWidth: '200px',
                                    objectFit: 'contain',
                                }}
                            />
                        )}
                        <div>
                            <h1 style={{
                                fontSize: '2.5rem',
                                fontWeight: '800',
                                marginBottom: '0.75rem',
                                color: branding.textColor || '#111827',
                                letterSpacing: '-0.02em',
                            }}>
                                {statusPage.name}
                            </h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <div style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                background: status.bg,
                                boxShadow: `0 0 12px ${status.bg}80`,
                                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                            }}></div>
                            <span style={{ 
                                color: '#374151', 
                                fontSize: '1.125rem',
                                fontWeight: '500',
                            }}>
                                {status.text}
                            </span>
                        </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        {(statusPage.contactEmail || statusPage.contactUrl) && (
                            <a
                                href={statusPage.contactUrl || `mailto:${statusPage.contactEmail}`}
                                style={{
                                    padding: '0.625rem 1.25rem',
                                    background: primaryColor,
                                    borderRadius: '0.5rem',
                                    textDecoration: 'none',
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    transition: 'all 0.2s ease',
                                    boxShadow: `0 2px 8px ${primaryColor}40`,
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = primaryColor + 'dd';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = `0 4px 12px ${primaryColor}60`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = primaryColor;
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = `0 2px 8px ${primaryColor}40`;
                                }}
                            >
                                Contact Us
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

