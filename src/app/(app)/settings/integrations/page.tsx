import SettingsPage from '@/components/settings/SettingsPage';
import SettingsSectionCard from '@/components/settings/SettingsSectionCard';
import SettingsEmptyState from '@/components/settings/SettingsEmptyState';
import Link from 'next/link';

export default function IntegrationsSettingsPage() {
    return (
        <SettingsPage
            currentPageId="integrations"
            backHref="/settings"
            title="Integrations"
            description="Connect OpsSentinal with the tools your team relies on."
        >
            <SettingsSectionCard
                title="Available integrations"
                description="Enable integrations to automate alerts and workflows."
            >
                <div className="settings-card-grid">
                    <Link className="settings-card-v2" href="/settings/integrations/slack">
                        <div>
                            <h3>Slack</h3>
                            <p>Send incident alerts and updates to Slack channels.</p>
                        </div>
                        <span aria-hidden="true">&rarr;</span>
                    </Link>
                </div>
            </SettingsSectionCard>

            <SettingsSectionCard
                title="More integrations"
                description="Request new integrations or manage custom webhooks."
            >
                <SettingsEmptyState
                    title="No additional integrations yet"
                    description="Add a new integration once your workspace connects other tools."
                    action={
                        <Link href="/settings/notifications" className="settings-link-button">
                            Configure notification providers
                        </Link>
                    }
                />
            </SettingsSectionCard>
        </SettingsPage>
    );
}

