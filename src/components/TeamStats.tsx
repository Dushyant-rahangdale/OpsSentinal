'use client';

type TeamStatsProps = {
  memberCount: number;
  serviceCount: number;
  ownerCount: number;
  adminCount: number;
};

export default function TeamStats({
  memberCount,
  serviceCount,
  ownerCount,
  adminCount,
}: TeamStatsProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}
    >
      <div
        style={{
          padding: '1rem',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.5rem',
          }}
        >
          Members
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
          {memberCount}
        </div>
      </div>

      <div
        style={{
          padding: '1rem',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.5rem',
          }}
        >
          Services
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
          {serviceCount}
        </div>
      </div>

      <div
        style={{
          padding: '1rem',
          background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
          border: '1px solid #c7d2fe',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.08)',
        }}
      >
        <div
          style={{
            fontSize: '0.75rem',
            color: '#4338ca',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.5rem',
            fontWeight: '600',
          }}
        >
          Owners
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3730a3' }}>{ownerCount}</div>
      </div>

      <div
        style={{
          padding: '1rem',
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          border: '1px solid #fde68a',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            fontSize: '0.75rem',
            color: '#78350f',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.5rem',
            fontWeight: '600',
          }}
        >
          Admins
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#92400e' }}>{adminCount}</div>
      </div>
    </div>
  );
}
