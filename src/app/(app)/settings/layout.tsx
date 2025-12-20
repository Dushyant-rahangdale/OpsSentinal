import SettingsNav from '@/components/SettingsNav';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    return (
        <main className="settings-shell">
            <header className="settings-header">
                <h1>Settings</h1>
                <p>Manage your account preferences, security, and access.</p>
            </header>
            <div className="settings-grid">
                <SettingsNav />
                <section className="settings-content">{children}</section>
            </div>
        </main>
    );
}
