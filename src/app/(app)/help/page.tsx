export default function HelpPage() {
    return (
        <main style={{ maxWidth: '980px', margin: '0 auto', padding: '1.5rem 0' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Help and docs</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Quick links to common workflows and support resources.
            </p>
            <div className="settings-cards">
                <a className="settings-card" href="/incidents">
                    <h3>Incident workflow</h3>
                    <p>Trigger, acknowledge, and resolve incidents with confidence.</p>
                </a>
                <a className="settings-card" href="/schedules">
                    <h3>Schedules</h3>
                    <p>Build on-call rotations and coverage handoffs.</p>
                </a>
                <a className="settings-card" href="/services">
                    <h3>Services</h3>
                    <p>Connect monitors and integrations to services.</p>
                </a>
                <a className="settings-card" href="/policies">
                    <h3>Policies</h3>
                    <p>Define escalation paths and responder roles.</p>
                </a>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', background: 'white', marginTop: '1.5rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>Need direct support?</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Contact your OpsGuard administrator or reach out to your internal support channel.
                </p>
            </div>
        </main>
    );
}
