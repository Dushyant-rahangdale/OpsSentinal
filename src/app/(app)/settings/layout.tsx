import { getUserPermissions } from '@/lib/rbac';
import SettingsLayoutShell from '@/components/settings/SettingsLayoutShell';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
    const permissions = await getUserPermissions();
    
    return (
        <SettingsLayoutShell isAdmin={permissions.isAdmin}>
            {children}
        </SettingsLayoutShell>
    );
}
