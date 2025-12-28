import { getUserPermissions } from '@/lib/rbac';
import SettingsShell from '@/components/settings/SettingsShell';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
    const permissions = await getUserPermissions();

    return (
        <SettingsShell isAdmin={permissions.isAdmin} isResponderOrAbove={permissions.isResponderOrAbove}>
            {children}
        </SettingsShell>
    );
}
