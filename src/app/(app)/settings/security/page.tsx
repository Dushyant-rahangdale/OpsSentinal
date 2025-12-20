import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import SecurityForm from '@/components/settings/SecurityForm';

export default async function SecuritySettingsPage() {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email ?? null;
    const user = email
        ? await prisma.user.findUnique({
            where: { email },
            select: { passwordHash: true, updatedAt: true }
        })
        : null;
    const ssoEnabled = Boolean(process.env.OIDC_ISSUER);
    const hasPassword = Boolean(user?.passwordHash);

    return (
        <div className="settings-section">
            <header className="settings-section-header">
                <h2>Security</h2>
                <p>Control how you sign in and monitor account activity.</p>
            </header>

            <div className="settings-panel">
                <div className="settings-row">
                    <div>
                        <h3>Single sign-on</h3>
                        <p>Authenticate with your identity provider.</p>
                    </div>
                    <span className={`settings-badge ${ssoEnabled ? 'on' : 'off'}`}>
                        {ssoEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                </div>

                <div className="settings-row">
                    <div>
                        <h3>Password</h3>
                        <p>Use a local password when SSO is unavailable.</p>
                    </div>
                    <span className={`settings-badge ${hasPassword ? 'on' : 'off'}`}>
                        {hasPassword ? 'Set' : 'Not set'}
                    </span>
                </div>

                <div className="settings-row">
                    <div>
                        <h3>Last updated</h3>
                        <p>{user?.updatedAt ? user.updatedAt.toLocaleString() : 'No recent changes'}</p>
                    </div>
                </div>

            </div>

            <SecurityForm hasPassword={hasPassword} />
            <div className="settings-note">
                For password resets or session issues, contact your OpsGuard administrator.
            </div>
        </div>
    );
}
