'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Props = {
    incidentId: string;
    serviceId: string;
};

export default function QuickActions({ incidentId, serviceId }: Props) {
    const [incidentUrl, setIncidentUrl] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIncidentUrl(`${window.location.origin}/incidents/${incidentId}`);
        }
    }, [incidentId]);

    const handleCopy = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
        } catch {
            // Ignore clipboard errors
        }
    };

    return (
        <div style={{ display: 'grid', gap: '0.6rem' }}>
            <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    Quick Actions
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Share incident link
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                    type="text"
                    readOnly
                    value={incidentUrl || `/incidents/${incidentId}`}
                    onFocus={(event) => event.currentTarget.select()}
                    style={{
                        flex: 1,
                        padding: '0.5rem 0.65rem',
                        fontSize: '0.75rem',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        background: '#fff',
                        color: 'var(--text-secondary)'
                    }}
                    aria-label="Incident link"
                />
                <button
                    type="button"
                    onClick={() => handleCopy(incidentUrl || `/incidents/${incidentId}`)}
                    className="glass-button"
                    style={{
                        height: '32px',
                        padding: '0 0.7rem',
                        fontSize: '0.75rem',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0'
                    }}
                    aria-label="Copy incident link from field"
                >
                    Copy URL
                </button>
            </div>
        </div>
    );
}
