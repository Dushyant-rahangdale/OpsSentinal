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
        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    },
    degraded: {
        bg: '#f59e0b',
        text: 'Some systems experiencing issues',
        icon: '⚠',
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    },
    outage: {
        bg: '#ef4444',
        text: 'Some systems are down',
        icon: '✕',
        gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    },
};

export default function StatusPageHeader({ statusPage, overallStatus, branding = {} }: StatusPageHeaderProps) {
    const status = STATUS_CONFIG[overallStatus];
    const logoUrl = branding.logoUrl;
    const primaryColor = branding.primaryColor || '#667eea';
    const textColor = branding.textColor || '#111827';

    return (
        <header 
            className="status-page-header"
            style={{
                background: 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)',
                borderBottom: '2px solid #e5e7eb',
                padding: '3rem 0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Decorative background elements */}
            <div style={{
                position: 'absolute',
                top: '-50%',
                right: '-10%',
                width: '500px',
                height: '500px',
                background: `radial-gradient(circle, ${primaryColor}08 0%, transparent 70%)`,
                borderRadius: '50%',
            }} />
            <div style={{
                position: 'absolute',
                bottom: '-30%',
                left: '-5%',
                width: '300px',
                height: '300px',
                background: `radial-gradient(circle, ${primaryColor}05 0%, transparent 70%)`,
                borderRadius: '50%',
            }} />

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
                    <div style={{ flex: 1, minWidth: '300px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        {logoUrl && (
                            <div style={{
                                padding: '0.75rem',
                                background: 'white',
                                borderRadius: '0.75rem',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                border: '1px solid #e5e7eb',
                            }}>
                                <img 
                                    src={logoUrl} 
                                    alt={statusPage.name}
                                    style={{
                                        height: '60px',
                                        maxWidth: '250px',
                                        objectFit: 'contain',
                                        display: 'block',
                                    }}
                                    onError={(e) => {
                                        // Hide image if it fails to load
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </div>
                        )}
                        <div style={{ flex: 1 }}>
                            <h1 style={{
                                fontSize: '3rem',
                                fontWeight: '900',
                                marginBottom: '1rem',
                                color: textColor,
                                letterSpacing: '-0.03em',
                                lineHeight: '1.1',
                                background: logoUrl ? 'none' : `linear-gradient(135deg, ${textColor} 0%, ${textColor}dd 100%)`,
                                WebkitBackgroundClip: logoUrl ? 'none' : 'text',
                                WebkitTextFillColor: logoUrl ? textColor : 'transparent',
                            }}>
                                {statusPage.name}
                            </h1>
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '1rem', 
                                flexWrap: 'wrap',
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem 1.25rem',
                                    background: status.gradient,
                                    borderRadius: '2rem',
                                    boxShadow: `0 4px 16px ${status.bg}40`,
                                    color: 'white',
                                    fontWeight: '600',
                                    fontSize: '0.9375rem',
                                }}>
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        background: 'white',
                                        boxShadow: `0 0 12px rgba(255,255,255,0.8)`,
                                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                                    }}></div>
                                    <span>{status.text}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
                        {(statusPage.contactEmail || statusPage.contactUrl) && (
                            <a
                                href={statusPage.contactUrl || `mailto:${statusPage.contactEmail}`}
                                style={{
                                    padding: '0.875rem 1.75rem',
                                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
                                    borderRadius: '0.75rem',
                                    textDecoration: 'none',
                                    color: 'white',
                                    fontSize: '0.9375rem',
                                    fontWeight: '700',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: `0 4px 16px ${primaryColor}40`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    letterSpacing: '0.01em',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = `0 8px 24px ${primaryColor}60`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = `0 4px 16px ${primaryColor}40`;
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                                Contact Us
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
