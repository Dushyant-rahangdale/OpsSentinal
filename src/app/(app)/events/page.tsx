import prisma from '@/lib/prisma';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { getUserTimeZone, formatDateTime } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export default async function EventLogsPage() {
  const session = await getServerSession(await getAuthOptions());
  const email = session?.user?.email ?? null;
  const user = email
    ? await prisma.user.findUnique({ where: { email }, select: { timeZone: true } })
    : null;
  const userTimeZone = getUserTimeZone(user ?? undefined);

  const events = await prisma.incidentEvent.findMany({
    include: {
      incident: {
        select: {
          id: true,
          title: true,
          service: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <main style={{ padding: '1rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            Event Logs
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Incident lifecycle events and audit trail
          </p>
        </div>
      </div>

      {/* Event Log Table */}
      <div className="glass-panel" style={{ background: 'white', overflow: 'hidden' }}>
        <div
          style={{
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <table
            style={{
              width: '100%',
              minWidth: '700px',
              borderCollapse: 'collapse',
              fontSize: '0.9rem',
            }}
          >
            <thead style={{ background: '#f9f9f9', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '1rem',
                    fontWeight: '600',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Timestamp
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '1rem',
                    fontWeight: '600',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Incident
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '1rem',
                    fontWeight: '600',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Service
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '1rem',
                    fontWeight: '600',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Event
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td
                    style={{
                      padding: '1rem',
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {formatDateTime(event.createdAt, userTimeZone, { format: 'datetime' })}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <Link
                      href={`/incidents/${event.incident.id}`}
                      style={{
                        color: 'var(--primary-color)',
                        textDecoration: 'none',
                        fontWeight: '500',
                      }}
                    >
                      #{event.incident.id.slice(-5).toUpperCase()}
                    </Link>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        marginTop: '0.25rem',
                      }}
                    >
                      {event.incident.title}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                    {event.incident.service.name}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: 'var(--primary-color)',
                          marginTop: '0.5rem',
                          flexShrink: 0,
                        }}
                      ></span>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {event.message}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="empty-state"
                    style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}
                  >
                    No events logged yet. Events will appear here when incidents are triggered,
                    acknowledged, or resolved.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
