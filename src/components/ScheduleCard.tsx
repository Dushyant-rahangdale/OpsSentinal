import Link from 'next/link';

type ScheduleCardProps = {
  schedule: {
    id: string;
    name: string;
    timeZone: string;
    layers: Array<{
      users: Array<{
        userId: string;
      }>;
    }>;
  };
};

export default function ScheduleCard({ schedule }: ScheduleCardProps) {
  const uniqueUsers = new Set<string>();
  schedule.layers.forEach(layer => {
    layer.users.forEach(user => uniqueUsers.add(user.userId));
  });

  return (
    <Link
      href={`/schedules/${schedule.id}`}
      className="glass-panel schedule-card"
      style={{
        display: 'block',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'all 0.2s',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '0.75rem',
        }}
      >
        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          {schedule.name}
        </h3>
        <span
          style={{
            padding: '0.3rem 0.6rem',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: '600',
            background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
            color: '#0c4a6e',
            border: '1px solid #bae6fd',
          }}
        >
          {schedule.timeZone}
        </span>
      </div>
      <p
        style={{
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          marginBottom: '1rem',
          lineHeight: 1.5,
        }}
      >
        Layered rotations with overrides and handoffs.
      </p>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '0.75rem',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}
        >
          <span>
            {schedule.layers.length} {schedule.layers.length === 1 ? 'layer' : 'layers'}
          </span>
          <span>
            {uniqueUsers.size} {uniqueUsers.size === 1 ? 'responder' : 'responders'}
          </span>
        </div>
        <span
          style={{
            fontSize: '0.85rem',
            color: 'var(--primary-color)',
            fontWeight: '600',
          }}
        >
          View schedule →
        </span>
      </div>
    </Link>
  );
}
