import { getUserPermissions } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import SlackOAuthConfigForm from '@/components/settings/SlackOAuthConfigForm';
import prisma from '@/lib/prisma';

export default async function SlackOAuthConfigPage() {
    const permissions = await getUserPermissions();
    
    if (!permissions) {
        redirect('/login');
    }

    if (!permissions.isAdmin) {
        redirect('/settings?error=admin_required');
    }

    // Get existing config (there should only be one)
    const config = await prisma.slackOAuthConfig.findFirst({
        orderBy: { updatedAt: 'desc' },
        include: {
            updater: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        }
    });

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    Slack OAuth Configuration
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                    Configure Slack OAuth credentials to enable Slack workspace integrations. These credentials are stored securely and encrypted.
                </p>
            </div>

            <SlackOAuthConfigForm config={config} />
        </div>
    );
}


