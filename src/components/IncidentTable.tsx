'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { bulkAcknowledge, bulkResolve } from '@/app/(app)/incidents/bulk-actions';

type Incident = {
    id: string;
    title: string;
    status: string;
    service: { name: string };
    assignee: { name: string } | null;
    createdAt: Date;
};

export default function IncidentTable({ incidents }: { incidents: Incident[] }) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isPending, startTransition] = useTransition();

    const toggleIncident = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleAll = () => {
        if (selectedIds.size === incidents.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(incidents.map(i => i.id)));
        }
    };

    const handleBulkAcknowledge = () => {
        startTransition(async () => {
            const result = await bulkAcknowledge(Array.from(selectedIds));
            if (result.success) {
                setSelectedIds(new Set());
            } else {
                alert(result.error || 'Failed to acknowledge incidents');
            }
        });
    };

    const handleBulkResolve = () => {
        startTransition(async () => {
            const result = await bulkResolve(Array.from(selectedIds));
            if (result.success) {
                setSelectedIds(new Set());
            } else {
                alert(result.error || 'Failed to resolve incidents');
            }
        });
    };

    return (
        <div className="glass-panel" style={{ background: 'white', overflow: 'hidden' }}>
            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
                <div style={{
                    padding: '1rem',
                    background: 'var(--gradient-primary)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ fontWeight: '600' }}>
                        {selectedIds.size} incident{selectedIds.size !== 1 ? 's' : ''} selected
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={handleBulkAcknowledge}
                            disabled={isPending}
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'rgba(255,255,255,0.2)',
                                border: '1px solid rgba(255,255,255,0.3)',
                                borderRadius: '6px',
                                color: 'white',
                                fontWeight: '500',
                                cursor: isPending ? 'not-allowed' : 'pointer',
                                opacity: isPending ? 0.6 : 1
                            }}
                        >
                            ✓ Acknowledge Selected
                        </button>
                        <button
                            onClick={handleBulkResolve}
                            disabled={isPending}
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'rgba(255,255,255,0.9)',
                                border: 'none',
                                borderRadius: '6px',
                                color: 'var(--primary)',
                                fontWeight: '600',
                                cursor: isPending ? 'not-allowed' : 'pointer',
                                opacity: isPending ? 0.6 : 1
                            }}
                        >
                            ✓ Resolve Selected
                        </button>
                    </div>
                </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead style={{ background: '#f9f9f9', borderBottom: '1px solid var(--border)' }}>
                    <tr>
                        <th style={{ padding: '1rem', width: '50px' }}>
                            <input
                                type="checkbox"
                                checked={selectedIds.size === incidents.length && incidents.length > 0}
                                onChange={toggleAll}
                                style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                            />
                        </th>
                        <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Status</th>
                        <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Incident</th>
                        <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Service</th>
                        <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Assignee</th>
                        <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Created</th>
                    </tr>
                </thead>
                <tbody>
                    {incidents.map((incident) => (
                        <tr key={incident.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '1rem' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(incident.id)}
                                    onChange={() => toggleIncident(incident.id)}
                                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                />
                            </td>
                            <td style={{ padding: '1rem' }}>
                                <span style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    background: incident.status === 'RESOLVED' ? '#e6f4ea' : (incident.status === 'ACKNOWLEDGED' ? '#fff8e1' : '#fce8e8'),
                                    color: incident.status === 'RESOLVED' ? 'var(--success)' : (incident.status === 'ACKNOWLEDGED' ? 'var(--warning)' : 'var(--danger)')
                                }}>
                                    {incident.status}
                                </span>
                            </td>
                            <td style={{ padding: '1rem' }}>
                                <Link href={`/incidents/${incident.id}`} style={{ fontWeight: '600', color: 'var(--primary)', textDecoration: 'none' }}>
                                    {incident.title}
                                </Link>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>#{incident.id.slice(-5).toUpperCase()}</div>
                            </td>
                            <td style={{ padding: '1rem' }}>{incident.service.name}</td>
                            <td style={{ padding: '1rem' }}>
                                {incident.assignee ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>{incident.assignee.name.charAt(0)}</div>
                                        {incident.assignee.name}
                                    </div>
                                ) : <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}
                            </td>
                            <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{new Date(incident.createdAt).toLocaleString()}</td>
                        </tr>
                    ))}
                    {incidents.length === 0 && (
                        <tr>
                            <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No incidents found matching your filters.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
