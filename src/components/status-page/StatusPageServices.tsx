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
    OPERATIONAL: { color: '#10b981', label: 'Operational', icon: '✓' },
    DEGRADED: { color: '#f59e0b', label: 'Degraded', icon: '⚠' },
    PARTIAL_OUTAGE: { color: '#f59e0b', label: 'Partial Outage', icon: '⚠' },
    MAJOR_OUTAGE: { color: '#ef4444', label: 'Major Outage', icon: '✕' },
    MAINTENANCE: { color: '#3b82f6', label: 'Maintenance', icon: '🔧' },
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
                fontSize: '1.5rem', 
                fontWeight: '700', 
                marginBottom: '1.5rem',
                color: '#111827',
            }}>
                Services
            </h2>
            <div style={{ 
                display: 'grid', 
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            }}>
                {visibleServices.map((service: any) => {
                    // Use calculated status if available, otherwise fall back to service.status
                    const serviceStatus = service.status || 'OPERATIONAL';
                    const statusConfig = STATUS_CONFIG[serviceStatus as keyof typeof STATUS_CONFIG] || 
                                       { color: '#6b7280', label: 'Unknown', icon: '?' };
                    const activeIncidents = service._count.incidents;

                    return (
                        <div
                            key={service.id}
                            className="status-service-card"
                            style={{
                                padding: '1.75rem',
                                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                border: `1px solid ${statusConfig.color}20`,
                                borderRadius: '1rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = `0 8px 24px ${statusConfig.color}25`;
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.borderColor = `${statusConfig.color}40`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = `${statusConfig.color}20`;
                            }}
                        >
                            {/* Status indicator line */}
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: '4px',
                                background: `linear-gradient(180deg, ${statusConfig.color} 0%, ${statusConfig.color}80 100%)`,
                            }} />
                            <div style={{ flex: 1, minWidth: 0, paddingLeft: '1rem' }}>
                                <h3 style={{ 
                                    fontSize: '1.25rem', 
                                    fontWeight: '700', 
                                    marginBottom: '0.5rem',
                                    color: '#111827',
                                    letterSpacing: '-0.01em',
                                }}>
                                    {service.displayName}
                                </h3>
                                {activeIncidents > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '0.375rem',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            background: '#fee2e2',
                                            color: '#991b1b',
                                        }}>
                                            {activeIncidents} active incident{activeIncidents !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.75rem',
                                flexShrink: 0,
                                paddingLeft: '1rem',
                            }}>
                                <div style={{
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '50%',
                                    background: statusConfig.color,
                                    boxShadow: `0 0 12px ${statusConfig.color}80, 0 0 24px ${statusConfig.color}40`,
                                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                                }}></div>
                                <span style={{ 
                                    fontSize: '0.875rem', 
                                    fontWeight: '600', 
                                    color: statusConfig.color,
                                    whiteSpace: 'nowrap',
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

