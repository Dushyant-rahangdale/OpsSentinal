import SettingsPage from '@/components/settings/SettingsPage';
import SettingsSectionCard from '@/components/settings/SettingsSectionCard';
import SettingsEmptyState from '@/components/settings/SettingsEmptyState';

export default function WorkspaceSettingsPage() {
    return (
        <SettingsPage
            currentPageId="workspace"
            backHref="/settings"
            title="Workspace"
            description="Manage organization details and team access."
        >
            <SettingsSectionCard
                title="Workspace profile"
                description="Organization name, branding, and defaults."
            >
                <SettingsEmptyState
                    title="Workspace profile coming soon"
                    description="This section will surface organization details once configured."
                />
            </SettingsSectionCard>

            <SettingsSectionCard
                title="Members"
                description="Invite and manage workspace members."
            >
                <SettingsEmptyState
                    title="Members are managed elsewhere"
                    description="Use the Users or Teams pages to manage access."
                />
            </SettingsSectionCard>

            {/* Danger Zone */}
            <div className="settings-danger-zone">
                <h3>Danger Zone</h3>
                <p>
                    Destructive actions that cannot be undone. Proceed with extreme caution.
                </p>
                <div style={{ marginTop: 'var(--spacing-4)' }}>
                    <button className="settings-danger-button" disabled>
                        Delete Workspace
                    </button>
                    <p style={{ marginTop: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                        Contact support to delete this workspace
                    </p>
                </div>
            </div>
        </SettingsPage>
    );
}

