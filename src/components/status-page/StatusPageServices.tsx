'use client';

interface Service {
    id: string;
    name: string;
    status: string;
    _count: {
        incidents: number;
    };
}

interface StatusPageService {
    id: string;
    serviceId: string;
    displayName?: string | null;
    showOnPage: boolean;
}

interface StatusPageServicesProps {
    services: Service[];
    statusPageServices: StatusPageService[];
}

const STATUS_CONFIG = {
    OPERATIONAL: { 
        color: '#10b981', 
        label: 'Operational', 
        icon: '✓',
        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    },
    DEGRADED: { 
        color: '#f59e0b', 
        label: 'Degraded', 
        icon: '⚠',
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    },
    PARTIAL_OUTAGE: { 
        color: '#f59e0b', 
        label: 'Partial Outage', 
        icon: '⚠',
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    },
    MAJOR_OUTAGE: { 
        color: '#ef4444', 
        label: 'Major Outage', 
        icon: '✕',
        gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    },
    MAINTENANCE: { 
        color: '#3b82f6', 
        label: 'Maintenance', 
        icon: '🔧',
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    },
};

export default function StatusPageServices({ services, statusPageServices }: StatusPageServicesProps) {
    // If statusPageServices is empty, show all services
    // Otherwise, only show configured services
    let visibleServices: any[] = [];
    
    if (statusPageServices.length === 0) {
        // No services configured, show all services
        visibleServices = services.map(service => ({
            ...service,
            displayName: service.name,
        }));
    } else {
        // Show only configured services
        visibleServices = statusPageServices
            .filter(sp => sp.showOnPage)
            .map(sp => {
                const service = services.find(s => s.id === sp.serviceId);
                if (!service) return null;
                return {
                    ...service,
                    displayName: sp.displayName || service.name,
                };
            })
            .filter(Boolean);
    }

    if (visibleServices.length === 0) return null;

    return (
        <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ 
                fontSize: '1.75rem', 
                fontWeight: '800', 
                marginBottom: '1.5rem',
                color: '#111827',
                letterSpacing: '-0.02em',
            }}>
                Services
            </h2>
            <div style={{ 
                display: 'grid', 
                gap: '1.25rem',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            }}>
                {visibleServices.map((service: any) => {
                    // Use calculated status if available, otherwise fall back to service.status
                    const serviceStatus = service.status || 'OPERATIONAL';
                    const statusConfig = STATUS_CONFIG[serviceStatus as keyof typeof STATUS_CONFIG] || 
                                       { color: '#6b7280', label: 'Unknown', icon: '?', gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' };
                    const activeIncidents = service._count.incidents;

                    return (
                        <div
                            key={service.id}
                            className="status-service-card"
                            style={{
                                padding: '2rem',
                                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                border: `2px solid ${statusConfig.color}20`,
                                borderRadius: '1.25rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = `0 12px 32px ${statusConfig.color}25`;
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.borderColor = `${statusConfig.color}40`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = `${statusConfig.color}20`;
                            }}
                        >
                            {/* Status indicator bar */}
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: '5px',
                                background: statusConfig.gradient,
                            }} />

                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
                                <div style={{ flex: 1, minWidth: 0, paddingLeft: '1rem' }}>
                                    <h3 style={{ 
                                        fontSize: '1.375rem', 
                                        fontWeight: '800', 
                                        marginBottom: '0.5rem',
                                        color: '#111827',
                                        letterSpacing: '-0.01em',
                                        lineHeight: '1.3',
                                    }}>
                                        {service.displayName}
                                    </h3>
                                    {activeIncidents > 0 && (
                                        <div style={{ 
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            padding: '0.375rem 0.875rem',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.8125rem',
                                            fontWeight: '700',
                                            background: '#fee2e2',
                                            color: '#991b1b',
                                            border: '1px solid #fecaca',
                                            marginTop: '0.5rem',
                                        }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                            </svg>
                                            {activeIncidents} active incident{activeIncidents !== 1 ? 's' : ''}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.75rem',
                                paddingLeft: '1rem',
                                marginTop: 'auto',
                            }}>
                                <div style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    background: statusConfig.gradient,
                                    boxShadow: `0 0 16px ${statusConfig.color}60, 0 0 32px ${statusConfig.color}30`,
                                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                                    flexShrink: 0,
                                }}></div>
                                <span style={{ 
                                    fontSize: '0.9375rem', 
                                    fontWeight: '700', 
                                    color: statusConfig.color,
                                    letterSpacing: '0.01em',
                                }}>
                                    {statusConfig.label}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
