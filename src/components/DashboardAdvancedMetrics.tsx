'use client';

type AdvancedMetricsProps = {
  totalIncidents: number;
  openIncidents: number;
  resolvedIncidents: number;
  acknowledgedIncidents: number;
  criticalIncidents: number;
  unassignedIncidents: number;
  servicesCount: number;
};

export default function DashboardAdvancedMetrics({
  totalIncidents,
  openIncidents,
  resolvedIncidents,
  acknowledgedIncidents,
  criticalIncidents,
  unassignedIncidents,
  servicesCount
}: AdvancedMetricsProps) {
  const resolutionRate = totalIncidents > 0 ? ((resolvedIncidents / totalIncidents) * 100).toFixed(1) : '0';
  const acknowledgmentRate = totalIncidents > 0 ? ((acknowledgedIncidents / totalIncidents) * 100).toFixed(1) : '0';
  const criticalRate = openIncidents > 0 ? ((criticalIncidents / openIncidents) * 100).toFixed(1) : '0';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: '600' }}>
            Resolution Rate
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#16a34a', marginBottom: '0.2rem' }}>
            {resolutionRate}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {resolvedIncidents} of {totalIncidents} resolved
          </div>
        </div>
        
        <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: '600' }}>
            Acknowledgment Rate
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626', marginBottom: '0.2rem' }}>
            {acknowledgmentRate}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {acknowledgedIncidents} of {totalIncidents} acknowledged
          </div>
        </div>
        
        <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: '600' }}>
            Critical Rate
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: criticalIncidents > 0 ? '#dc2626' : '#16a34a', marginBottom: '0.2rem' }}>
            {criticalRate}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {criticalIncidents} critical of {openIncidents} open
          </div>
        </div>
        
        <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: '600' }}>
            Services Monitored
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
            {servicesCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Active services
          </div>
        </div>
      </div>
  );
}

