export default function SettingsOverviewPage() {
    return (
        <div className="settings-overview">
            <h2>Overview</h2>
            <p className="settings-subtitle">
                Update your account profile, adjust personal preferences, and review security controls.
            </p>
            <div className="settings-cards">
                <a className="settings-card" href="/settings/profile">
                    <h3>Profile</h3>
                    <p>Review identity details and workspace role.</p>
                </a>
                <a className="settings-card" href="/settings/preferences">
                    <h3>Preferences</h3>
                    <p>Timezone, notification defaults, and display options.</p>
                </a>
                <a className="settings-card" href="/settings/security">
                    <h3>Security</h3>
                    <p>Password, active sessions, and SSO status.</p>
                </a>
                <a className="settings-card" href="/settings/api-keys">
                    <h3>API keys</h3>
                    <p>Create and rotate integration credentials.</p>
                </a>
            </div>
        </div>
    );
}
