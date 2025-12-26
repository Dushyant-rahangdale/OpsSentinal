import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { assertAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import StatusPageSubscribers from '@/components/status-page/StatusPageSubscribers';
import StatusPageEmailConfig from '@/components/status-page/StatusPageEmailConfig';

export default async function StatusPageSubscribersPage() {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect('/login');
    }

    try {
        await assertAdmin();
    } catch {
        redirect('/');
    }

    // Get status page
    const statusPage = await prisma.statusPage.findFirst({
        where: { enabled: true },
    });

    if (!statusPage) {
        redirect('/settings/status-page');
    }

    return (
        <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '24px',
        }}>
            <div style={{
                marginBottom: '32px',
            }}>
                <h1 style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#1f2937',
                    marginBottom: '8px',
                }}>
                    Status Page Subscribers
                </h1>
                <p style={{
                    fontSize: '14px',
                    color: '#6b7280',
                }}>
                    Manage email subscribers and configure notification settings
                </p>
            </div>

            <div style={{
                display: 'grid',
                gap: '24px',
            }}>
                <StatusPageEmailConfig
                    statusPageId={statusPage.id}
                    currentProvider={statusPage.emailProvider}
                />

                <StatusPageSubscribers statusPageId={statusPage.id} />
            </div>
        </div>
    );
}
