'use client';

type PriorityBadgeProps = {
    priority: string | null | undefined;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
};

export default function PriorityBadge({ priority, size = 'md', showLabel = false }: PriorityBadgeProps) {
    if (!priority) {
        return null;
    }

    const sizeStyles = {
        sm: { padding: '0.15rem 0.5rem', fontSize: '0.7rem' },
        md: { padding: '0.25rem 0.75rem', fontSize: '0.8rem' },
        lg: { padding: '0.35rem 1rem', fontSize: '0.9rem' }
    };

    const priorityConfig: Record<string, { 
        bg: string; 
        color: string; 
        border: string; 
        label: string;
        severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    }> = {
        'P1': {
            bg: 'linear-gradient(180deg, #fee2e2 0%, #fecaca 100%)',
            color: '#991b1b',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            label: 'Critical',
            severity: 'CRITICAL'
        },
        'P2': {
            bg: 'linear-gradient(180deg, #fed7aa 0%, #fdba74 100%)',
            color: '#9a3412',
            border: '1px solid rgba(234, 88, 12, 0.3)',
            label: 'High',
            severity: 'HIGH'
        },
        'P3': {
            bg: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)',
            color: '#92400e',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            label: 'Medium',
            severity: 'MEDIUM'
        },
        'P4': {
            bg: 'linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%)',
            color: '#1e40af',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            label: 'Low',
            severity: 'LOW'
        },
        'P5': {
            bg: 'linear-gradient(180deg, #f3f4f6 0%, #e5e7eb 100%)',
            color: '#4b5563',
            border: '1px solid rgba(107, 114, 128, 0.3)',
            label: 'Info',
            severity: 'INFO'
        }
    };

    const config = priorityConfig[priority] || priorityConfig['P5'];
    const style = sizeStyles[size];

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                ...style,
                background: config.bg,
                color: config.color,
                border: config.border,
                borderRadius: '0px',
                fontWeight: 700,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                letterSpacing: '0.05em',
                boxShadow: size === 'lg' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
            }}
            title={showLabel ? undefined : `${priority} - ${config.label}`}
        >
            <span style={{ fontSize: size === 'lg' ? '0.95em' : size === 'md' ? '0.9em' : '0.85em', fontWeight: 800 }}>
                {priority}
            </span>
            {showLabel && (
                <span style={{ fontSize: size === 'lg' ? '0.75em' : size === 'md' ? '0.7em' : '0.65em', fontWeight: 600, opacity: 0.9 }}>
                    {config.label}
                </span>
            )}
        </span>
    );
}









