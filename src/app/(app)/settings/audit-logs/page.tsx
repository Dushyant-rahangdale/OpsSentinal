import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserTimeZone, formatDateTime } from '@/lib/timezone';
import SettingsPage from '@/components/settings/SettingsPage';

export const dynamic = 'force-dynamic';

export default async function AuditLogsSettingsPage() {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email ?? null;
    const user = email ? await prisma.user.findUnique({ where: { email }, select: { timeZone: true } }) : null;
    const userTimeZone = getUserTimeZone(user ?? undefined);

    const logs = await prisma.auditLog.findMany({
        include: {
            actor: true
        },
        orderBy: { createdAt: 'desc' },
        take: 250
    });

    return (
        <SettingsPage
            currentPageId="audit-logs"
            backHref="/settings"
            title="Audit Logs"
            description="Track critical configuration changes across the workspace."
        >
            <div className="glass-panel" style={{ background: 'white', overflow: 'hidden' }}>
                <div style={{
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch'
                }}>
                    <table style={{
                        width: '100%',
                        minWidth: '800px',
                        borderCollapse: 'collapse',
                        fontSize: '0.9rem'
                    }}>
                        <thead style={{ background: '#f9f9f9', borderBottom: '1px solid var(--border)' }}>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Timestamp</th>
                                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Actor</th>
                                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Action</th>
                                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Entity</th>
                                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {formatDateTime(log.createdAt, userTimeZone, { format: 'datetime' })}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: '600' }}>{log.actor?.name || 'System'}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{log.actor?.email || '-'}</div>
                                    </td>
                                    <td style={{ padding: '1rem', fontWeight: '600' }}>{log.action}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontSize: '0.85rem' }}>{log.entityType}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.entityId || '-'}</div>
                                    </td>
                                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {log.details ? JSON.stringify(log.details) : '-'}
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="empty-state" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No audit entries yet. Actions on users, teams, and services will appear here.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </SettingsPage>
    );
}
