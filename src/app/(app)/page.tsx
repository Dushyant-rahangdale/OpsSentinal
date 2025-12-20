import Link from 'next/link';
import prisma from '@/lib/prisma';
import DashboardFilters from '@/components/DashboardFilters';
import IncidentTable from '@/components/IncidentTable';

export const revalidate = 30;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const awaitedSearchParams = await searchParams;
  const status = typeof awaitedSearchParams.status === 'string' ? awaitedSearchParams.status : undefined;
  const assignee = typeof awaitedSearchParams.assignee === 'string' ? awaitedSearchParams.assignee : undefined;
  const service = typeof awaitedSearchParams.service === 'string' ? awaitedSearchParams.service : undefined;

  // Build filter query
  const where: any = {};
  if (status && status !== 'ALL') where.status = status;
  if (assignee) where.assigneeId = assignee;
  if (service) where.serviceId = service;

  // Fetch Data in Parallel
  const [incidents, services, users, activeShifts] = await Promise.all([
    prisma.incident.findMany({
      where,
      include: { service: true, assignee: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.service.findMany(),
    prisma.user.findMany(),
    prisma.onCallShift.findMany({
      where: {
        start: { lte: new Date() },
        end: { gte: new Date() }
      },
      include: { user: true, schedule: true }
    })
  ]);

  // Calculate system status based on incidents
  const openIncidents = incidents.filter(i => i.status !== 'RESOLVED');
  const criticalIncidents = openIncidents.filter(i => i.urgency === 'HIGH');

  const systemStatus = criticalIncidents.length > 0
    ? { label: 'CRITICAL', color: '#ef5350' }
    : openIncidents.length > 0
      ? { label: 'DEGRADED', color: '#ffa726' }
      : { label: 'OPERATIONAL', color: '#81c784' };

  return (
    <main style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Welcome Hero - Red Touch */}
      <div style={{
        background: 'var(--gradient-primary)',
        color: 'white',
        padding: '2rem',
        borderRadius: '12px',
        marginBottom: '2rem',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Command Center</h1>
          <p style={{ opacity: 0.9, fontSize: '1.1rem' }}>
            System Status: <strong style={{ color: systemStatus.color }}>{systemStatus.label}</strong>
            {openIncidents.length > 0 && (
              <span style={{ marginLeft: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
                ({openIncidents.length} active incident{openIncidents.length !== 1 ? 's' : ''})
              </span>
            )}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '3rem', fontWeight: '800', lineHeight: 1 }}>99.9%</div>
          <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>UPTIME (Last 30 Days)</div>
        </div>
      </div>

      {/* Header Widget Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Main Hero / Stats */}
        <div className="glass-panel" style={{ padding: '2rem', background: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Good Afternoon, Alice</h1>
          <p style={{ color: 'var(--text-secondary)' }}>You have <span style={{ fontWeight: 'bold', color: 'var(--danger)' }}>{incidents.filter(i => i.status !== 'RESOLVED').length} open incidents</span> across your services.</p>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
            <Link href="/incidents/create" className="glass-button primary">Trigger Incident</Link>
            <Link href="/analytics" className="glass-button">View Analytics</Link>
          </div>
        </div>

        {/* Who is On Call Widget */}
        <div className="glass-panel" style={{ padding: '1.5rem', background: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Who is On-Call</h3>
            <Link href="/schedules" style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none' }}>View All</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeShifts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No active shifts found.</p>
            ) : activeShifts.slice(0, 3).map(shift => (
              <div key={shift.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f0f0f0', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                  {shift.user.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{shift.user.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{shift.schedule.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <DashboardFilters
        initialStatus={status}
        initialService={service}
        initialAssignee={assignee}
        services={services}
        users={users}
      />

      {/* Incident List Table */}
      <IncidentTable incidents={incidents} />
    </main>
  );
}
