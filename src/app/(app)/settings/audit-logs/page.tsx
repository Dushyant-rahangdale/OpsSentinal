import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth';
import { getUserTimeZone, formatDateTime } from '@/lib/timezone';
import SettingsPage from '@/components/settings/SettingsPage';
import SettingsSectionCard from '@/components/settings/SettingsSectionCard';
import { DirectUserAvatar } from '@/components/UserAvatar';
import { getDefaultAvatar } from '@/lib/avatar';

export const dynamic = 'force-dynamic';

export default async function AuditLogsSettingsPage() {
  const session = await getServerSession(await getAuthOptions());
  const email = session?.user?.email ?? null;
  const user = email
    ? await prisma.user.findUnique({ where: { email }, select: { timeZone: true } })
    : null;
  const userTimeZone = getUserTimeZone(user ?? undefined);

  const logs = await prisma.auditLog.findMany({
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          gender: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 250,
  });

  return (
    <SettingsPage
      currentPageId="audit-logs"
      backHref="/settings"
      title="Audit Logs"
      description="Track critical configuration changes across the workspace."
    >
      <SettingsSectionCard
        title="Recent changes"
        description="Review configuration updates across users, teams, and services."
      >
        <div className="settings-table-card">
          <div className="settings-table-header">
            <h3>Audit activity</h3>
            <p>{logs.length} most recent events</p>
          </div>
          <div className="settings-table-wrapper">
            <table className="settings-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className="settings-code">
                      {formatDateTime(log.createdAt, userTimeZone, { format: 'datetime' })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {log.actor ? (
                          <DirectUserAvatar
                            avatarUrl={
                              log.actor.avatarUrl ||
                              getDefaultAvatar(log.actor.gender, log.actor.name)
                            }
                            name={log.actor.name}
                            size="sm"
                          />
                        ) : (
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#e5e7eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              color: '#6b7280',
                            }}
                          >
                            SYS
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600 }}>{log.actor?.name || 'System'}</div>
                          <div className="settings-muted">{log.actor?.email || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.action}</td>
                    <td>
                      <div>{log.entityType}</div>
                      <div className="settings-muted">{log.entityId || '-'}</div>
                    </td>
                    <td className="settings-muted">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="settings-muted"
                      style={{ textAlign: 'center', padding: '2rem' }}
                    >
                      No audit entries yet. Actions on users, teams, and services will appear here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </SettingsSectionCard>
    </SettingsPage>
  );
}
