import { getUserPermissions } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import SlackIntegrationPage from '@/components/settings/SlackIntegrationPage';
import SettingsPage from '@/components/settings/SettingsPage';

export default async function GlobalSlackIntegrationPage() {
    const permissions = await getUserPermissions();

    if (!permissions) {
        redirect('/login');
    }

    // Get global Slack integration (not tied to any service)
    const globalIntegration = await prisma.slackIntegration.findFirst({
        where: {
            service: null // Global integration
        },
        include: {
            installer: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        },
        orderBy: { updatedAt: 'desc' }
    });

    // Check if OAuth is configured (database only - no env vars for UI-driven setup)
    const oauthConfig = await prisma.slackOAuthConfig.findFirst({
        where: { enabled: true },
        orderBy: { updatedAt: 'desc' }
    });

    const isOAuthConfigured = !!(oauthConfig?.clientId && oauthConfig?.clientSecret);

    return (
        <SettingsPage
            currentPageId="slack"
            backHref="/settings/integrations"
            title="Slack Integration"
            description="Connect your Slack workspace to receive incident notifications."
        >
            <SlackIntegrationPage
                integration={globalIntegration}
                isOAuthConfigured={isOAuthConfigured}
                isAdmin={permissions.isAdmin}
            />
        </SettingsPage>
    );
}


