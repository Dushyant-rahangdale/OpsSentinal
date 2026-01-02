import prisma from '@/lib/prisma';
import { getAuthOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import SecurityForm from '@/components/settings/SecurityForm';
import SettingsPage from '@/components/settings/SettingsPage';
import SettingsSectionCard from '@/components/settings/SettingsSectionCard';
import SsoSettingsForm from '@/components/settings/SsoSettingsForm';
import { getUserTimeZone, formatDateTime } from '@/lib/timezone';

export default async function SecuritySettingsPage() {
    const session = await getServerSession(await getAuthOptions());
    const email = session?.user?.email ?? null;
    const user = email
        ? await prisma.user.findUnique({
            where: { email },
            select: { passwordHash: true, updatedAt: true, timeZone: true }
        })
        : null;

    const oidcConfig = await prisma.oidcConfig.findFirst({
        orderBy: { updatedAt: 'desc' }
    });

    const systemSettings = await prisma.systemSettings.findUnique({
        where: { id: 'default' },
        select: { appUrl: true }
    });

    const callbackBase = systemSettings?.appUrl || process.env.NEXT_PUBLIC_APP_URL || '';
    const callbackUrl = callbackBase
        ? `${callbackBase.replace(/\/$/, '')}/api/auth/callback/oidc`
        : '/api/auth/callback/oidc';
    const hasEncryptionKey = Boolean(process.env.ENCRYPTION_KEY);

    const ssoEnabled = Boolean(oidcConfig?.enabled);
    const hasPassword = Boolean(user?.passwordHash);
    const timeZone = getUserTimeZone(user ?? undefined);
    const isAdmin = (session?.user as any)?.role === 'ADMIN'; // eslint-disable-line @typescript-eslint/no-explicit-any



    return (
        <SettingsPage
            currentPageId="security"
            backHref="/settings"
            title="Security"
            description="Control how you sign in and monitor account activity."
        >
            <SettingsSectionCard
                title="Security overview"
                description="Your sign-in methods and recent updates."
            >
                <div className="settings-summary-grid">
                    <div className="settings-summary-card">
                        <span>Single sign-on</span>
                        <strong>{ssoEnabled ? 'Enabled' : 'Disabled'}</strong>
                        <small>Authenticate with your identity provider.</small>
                    </div>
                    <div className="settings-summary-card">
                        <span>Password</span>
                        <strong>{hasPassword ? 'Set' : 'Not set'}</strong>
                        <small>Use a local password when SSO is unavailable.</small>
                    </div>
                    <div className="settings-summary-card">
                        <span>Last updated</span>
                        <strong>{user?.updatedAt ? formatDateTime(user.updatedAt, timeZone, { format: 'datetime' }) : 'No recent changes'}</strong>
                        <small>Recent credential change timestamp.</small>
                    </div>
                </div>
            </SettingsSectionCard>

            <SettingsSectionCard
                title="Single sign-on (OIDC)"
                description="SSO configuration has moved to System Settings."
            >
                <div className="settings-inline-note">
                    SSO settings are now managed in <a href="/settings/system" style={{ textDecoration: 'underline' }}>System Settings</a>.
                    {isAdmin ? ' (Admin access required)' : ' (Contact your administrator)'}
                </div>
            </SettingsSectionCard>

            <SettingsSectionCard
                title="Password"
                description="Update your account password."
            >
                <SecurityForm hasPassword={hasPassword} />
                <div className="settings-inline-note">
                    For password resets or session issues, contact your OpsSentinal administrator.
                </div>
            </SettingsSectionCard>
        </SettingsPage>
    );
}
