import LogsClient from './LogsClient';

export const dynamic = 'force-dynamic';

export default function PublicLogsPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '2rem',
        background:
          'radial-gradient(circle at top right, rgba(211,47,47,0.12), transparent 45%), radial-gradient(circle at bottom left, rgba(17,24,39,0.08), transparent 45%), #f8fafc',
      }}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '2rem',
          background: 'white',
        }}
      >
        <header
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Live App Logs
          </h1>
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: '#fff7ed',
              border: '1px solid #ffedd5',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            <p style={{ color: '#9a3412', margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>
              ⚠️ CAUTION: These logs are publicly accessible for debugging purposes. Although
              sensitive data is sanitized, use this page only during troubleshooting.
            </p>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Public, temporary log view for quick troubleshooting. Remove by deleting{' '}
            <code>/logs</code> and <code>/api/public-logs</code>.
          </p>
        </header>
        <LogsClient />
      </div>
    </main>
  );
}
