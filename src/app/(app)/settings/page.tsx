import { getUserPermissions } from '@/lib/rbac';
import Link from 'next/link';
import SettingsPage from '@/components/settings/SettingsPage';
import SettingsSectionCard from '@/components/settings/SettingsSectionCard';
import SettingsSearch from '@/components/settings/SettingsSearch';
import { SETTINGS_NAV_SECTIONS, SETTINGS_NAV_ITEMS } from '@/components/settings/navConfig';

export default async function SettingsOverviewPage() {
    const permissions = await getUserPermissions();

    const canAccess = (item: { requiresAdmin?: boolean; requiresResponder?: boolean }) => {
        if (item.requiresAdmin && !permissions.isAdmin) return false;
        if (item.requiresResponder && !permissions.isResponderOrAbove) return false;
        return true;
    };

    const sectionGroups = SETTINGS_NAV_SECTIONS.filter((section) => section.id !== 'overview');
    const popularLinks = SETTINGS_NAV_ITEMS.filter((item) => ['profile', 'preferences', 'security', 'api-keys', 'notifications-admin'].includes(item.id));

    return (
        <SettingsPage
            title="Settings"
            description="Manage your account, workspace configuration, and integrations in one place."
        >
            <SettingsSectionCard
                title="Search settings"
                description="Quickly jump to the page you need."
                className="settings-section--overview"
            >
                <SettingsSearch items={SETTINGS_NAV_ITEMS} placeholder="Search settings, integrations, billing..." />
                <div className="settings-quick-links">
                    {popularLinks.map((item) => {
                        const disabled = !canAccess(item);
                        const quickLinkClass = `settings-quick-link settings-quick-link--${item.id}`;
                        return disabled ? (
                            <div key={item.id} className={`${quickLinkClass} disabled`.trim()}>
                                <span>{item.label}</span>
                                <small>Restricted</small>
                            </div>
                        ) : (
                            <Link key={item.id} href={item.href} className={quickLinkClass}>
                                <span>{item.label}</span>
                                <small>{item.description}</small>
                            </Link>
                        );
                    })}
                </div>
            </SettingsSectionCard>

            {sectionGroups.map((section) => (
                <SettingsSectionCard
                    key={section.id}
                    title={section.label}
                    description="Quick access to frequently used configuration areas."
                    className={`settings-section--${section.id}`}
                >
                    <div className={`settings-card-grid settings-card-grid--${section.id}`.trim()}>
                        {section.items.map((item) => {
                            const disabled = !canAccess(item);
                            const cardClass = `settings-card-v2 settings-card--${section.id}`;

                            if (disabled) {
                                return (
                                    <div key={item.id} className={`${cardClass} disabled`.trim()}>
                                        <div>
                                            <h3>{item.label}</h3>
                                            <p>{item.description}</p>
                                        </div>
                                        <span className="settings-card-badge">
                                            {item.requiresAdmin ? 'Admin only' : 'Responder+'}
                                        </span>
                                    </div>
                                );
                            }

                            return (
                                <Link key={item.id} href={item.href} className={cardClass}>
                                    <div>
                                        <h3>{item.label}</h3>
                                        <p>{item.description}</p>
                                    </div>
                                    <span aria-hidden="true">&rarr;</span>
                                </Link>
                            );
                        })}
                    </div>
                </SettingsSectionCard>
            ))}
        </SettingsPage>
    );
}
