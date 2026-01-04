'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';
import StatusBadge from './StatusBadge';
import EscalationStatusBadge from './EscalationStatusBadge';
import PriorityBadge from './PriorityBadge';
import AssigneeSection from './AssigneeSection';
import type { IncidentListItem } from '@/types/incident-list';
import { updateIncidentStatus } from '@/app/(app)/incidents/actions';
import { bulkAcknowledge, bulkResolve, bulkReassign, bulkUpdatePriority, bulkSnooze, bulkUnsnooze, bulkSuppress, bulkUnsuppress, bulkUpdateUrgency, bulkUpdateStatus } from '@/app/(app)/incidents/bulk-actions';
import { useToast } from '../ToastProvider';
import Pagination from './Pagination';

type IncidentsListTableProps = {
    incidents: IncidentListItem[];
    users: Array<{ id: string; name: string; email: string }>;
    canManageIncidents: boolean;
    pagination?: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
    };
};

export default function IncidentsListTable({ incidents, users, canManageIncidents, pagination }: IncidentsListTableProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();
    const { userTimeZone } = useTimezone();
    const [_expandedRow, _setExpandedRow] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkAction, setBulkAction] = useState<'reassign' | 'priority' | 'snooze' | 'urgency' | 'status' | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleStatusChange = async (incidentId: string, status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SNOOZED' | 'SUPPRESSED') => {
        startTransition(async () => {
            try {
                await updateIncidentStatus(incidentId, status);
                showToast(`Incident ${status.toLowerCase()} successfully`, 'success');
                router.refresh();
            } catch (error) {
                const { getUserFriendlyError } = await import('@/lib/user-friendly-errors');
                showToast(getUserFriendlyError(error) || 'Failed to update status', 'error');
            }
        });
    };


    const toggleSelectAll = () => {
        if (selectedIds.size === incidents.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(incidents.map(i => i.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkAction = async (action: 'acknowledge' | 'resolve' | 'reassign' | 'priority' | 'snooze' | 'unsnooze' | 'suppress' | 'unsuppress' | 'urgency' | 'status', value?: string | number) => {
        if (selectedIds.size === 0) {
            showToast('Please select incidents first', 'error');
            return;
        }

        startTransition(async () => {
            try {
                let result;
                if (action === 'acknowledge') {
                    result = await bulkAcknowledge(Array.from(selectedIds));
                } else if (action === 'resolve') {
                    result = await bulkResolve(Array.from(selectedIds));
                } else if (action === 'reassign' && value) {
                    result = await bulkReassign(Array.from(selectedIds), value as string);
                } else if (action === 'priority' && value !== undefined) {
                    result = await bulkUpdatePriority(Array.from(selectedIds), value as string);
                } else if (action === 'snooze' && typeof value === 'number') {
                    result = await bulkSnooze(Array.from(selectedIds), value, null);
                } else if (action === 'unsnooze') {
                    result = await bulkUnsnooze(Array.from(selectedIds));
                } else if (action === 'suppress') {
                    result = await bulkSuppress(Array.from(selectedIds));
                } else if (action === 'unsuppress') {
                    result = await bulkUnsuppress(Array.from(selectedIds));
                } else if (action === 'urgency' && value) {
                    result = await bulkUpdateUrgency(Array.from(selectedIds), value as 'HIGH' | 'LOW');
                } else if (action === 'status' && value) {
                    result = await bulkUpdateStatus(Array.from(selectedIds), value as 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SNOOZED' | 'SUPPRESSED');
                } else {
                    return;
                }

                if (result.success) {
                    showToast(`${result.count} incident(s) updated successfully`, 'success');
                    setSelectedIds(new Set());
                    setBulkAction(null);
                    router.refresh();
                } else {
                    showToast(result.error || 'Failed to update incidents', 'error');
                }
            } catch (error) {
                const { getUserFriendlyError } = await import('@/lib/user-friendly-errors');
                showToast(getUserFriendlyError(error) || 'Failed to update incidents', 'error');
            }
        });
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        searchParams.forEach((value, key) => {
            // Exclude page parameter - export should export all matching incidents
            if (key !== 'page') {
                params.append(key, value);
            }
        });
        window.open(`/api/incidents/export?${params.toString()}`, '_blank');
    };

    const gridTemplateColumns = canManageIncidents
        ? '44px minmax(320px, 2.2fr) minmax(220px, 1.2fr) minmax(260px, 1.6fr) minmax(200px, 1fr) 190px 190px'
        : 'minmax(340px, 2.2fr) minmax(220px, 1.2fr) minmax(260px, 1.6fr) minmax(200px, 1fr) 190px 190px';

    const headerCellStyle: React.CSSProperties = {
        padding: '0.75rem 0.85rem',
        fontWeight: 800,
        color: 'var(--text-secondary)',
        fontSize: '0.7rem',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        whiteSpace: 'nowrap',
    };

    const buildUrgencyChip = (urgency: string | null | undefined) => {
        if (!urgency) return null;
        const u = urgency.toUpperCase();
        const config =
            u === 'HIGH'
                ? { bg: 'rgba(239, 68, 68, 0.10)', border: 'rgba(239, 68, 68, 0.25)', color: '#b91c1c' }
                : u === 'MEDIUM'
                    ? { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)', color: '#b45309' }
                    : { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.25)', color: '#15803d' };

        return (
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '9999px',
                    background: config.bg,
                    border: `1px solid ${config.border}`,
                    color: config.color,
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                }}
                title={`Urgency: ${u}`}
            >
                {u}
            </span>
        );
    };

    const closeDetailsMenu = (el: HTMLElement) => {
        const details = el.closest('details') as HTMLDetailsElement | null;
        if (details) details.open = false;
    };

    return (
        <div className="glass-panel" style={{ background: 'white', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
            {/* Bulk Actions Bar */}
            {(selectedIds.size > 0 || bulkAction) && (
                <div style={{
                    padding: '0.75rem 1.25rem',
                    background: 'linear-gradient(90deg, var(--primary-dark) 0%, var(--primary) 100%)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap'
                }}>
                    <span style={{ fontWeight: '650', fontSize: '0.9rem' }}>
                        {selectedIds.size} incident{selectedIds.size !== 1 ? 's' : ''} selected
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {bulkAction === 'reassign' ? (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <select
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleBulkAction('reassign', e.target.value);
                                        }
                                    }}
                                    aria-label="Select assignee for bulk reassignment"
                                    style={{
                                        padding: '0.5rem',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'white',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">Select assignee...</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>{user.name}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => setBulkAction(null)}
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        background: 'rgba(255,255,255,0.2)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: '0px',
                                        color: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : bulkAction === 'priority' ? (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <select
                                    onChange={(e) => {
                                        handleBulkAction('priority', e.target.value);
                                    }}
                                    aria-label="Select priority for bulk update"
                                    style={{
                                        padding: '0.5rem',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'white',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">Select priority...</option>
                                    <option value="">Auto (Default)</option>
                                    <option value="P1">P1 - Critical</option>
                                    <option value="P2">P2 - High</option>
                                    <option value="P3">P3 - Medium</option>
                                    <option value="P4">P4 - Low</option>
                                    <option value="P5">P5 - Info</option>
                                </select>
                                <button
                                    onClick={() => setBulkAction(null)}
                                    aria-label="Cancel bulk priority update"
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        background: 'rgba(255,255,255,0.2)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : bulkAction === 'snooze' ? (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <select
                                    onChange={(e) => {
                                        const duration = parseInt(e.target.value);
                                        if (duration) {
                                            handleBulkAction('snooze', duration);
                                        }
                                    }}
                                    aria-label="Select snooze duration for bulk action"
                                    style={{
                                        padding: '0.5rem',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'white',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">Select snooze duration...</option>
                                    <option value="15">15 minutes</option>
                                    <option value="30">30 minutes</option>
                                    <option value="60">1 hour</option>
                                    <option value="240">4 hours</option>
                                    <option value="480">8 hours</option>
                                    <option value="1440">24 hours</option>
                                </select>
                                <button
                                    onClick={() => setBulkAction(null)}
                                    aria-label="Cancel bulk snooze action"
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        background: 'rgba(255,255,255,0.2)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : bulkAction === 'urgency' ? (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <select
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleBulkAction('urgency', e.target.value as 'HIGH' | 'LOW');
                                        }
                                    }}
                                    aria-label="Select urgency for bulk update"
                                    style={{
                                        padding: '0.5rem',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'white',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">Select urgency...</option>
                                    <option value="HIGH">HIGH</option>
                                    <option value="LOW">LOW</option>
                                </select>
                                <button
                                    onClick={() => setBulkAction(null)}
                                    aria-label="Cancel bulk urgency update"
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        background: 'rgba(255,255,255,0.2)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : bulkAction === 'status' ? (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <select
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleBulkAction('status', e.target.value as 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SNOOZED' | 'SUPPRESSED');
                                        }
                                    }}
                                    aria-label="Select status for bulk update"
                                    style={{
                                        padding: '0.5rem',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'white',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">Select status...</option>
                                    <option value="OPEN">OPEN</option>
                                    <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                                    <option value="RESOLVED">RESOLVED</option>
                                    <option value="SNOOZED">SNOOZED</option>
                                    <option value="SUPPRESSED">SUPPRESSED</option>
                                </select>
                                <button
                                    onClick={() => setBulkAction(null)}
                                    aria-label="Cancel bulk status update"
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        background: 'rgba(255,255,255,0.2)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={() => handleBulkAction('acknowledge')}
                                    disabled={isPending}
                                    aria-label={`Acknowledge ${selectedIds.size} selected incident${selectedIds.size !== 1 ? 's' : ''}`}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(255,255,255,0.2)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'white',
                                        fontWeight: '500',
                                        cursor: isPending ? 'not-allowed' : 'pointer',
                                        opacity: isPending ? 0.6 : 1
                                    }}
                                >
                                    ✓ Acknowledge
                                </button>
                                <button
                                    onClick={() => handleBulkAction('resolve')}
                                    disabled={isPending}
                                    aria-label={`Resolve ${selectedIds.size} selected incident${selectedIds.size !== 1 ? 's' : ''}`}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(255,255,255,0.9)',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'var(--primary)',
                                        fontWeight: '600',
                                        cursor: isPending ? 'not-allowed' : 'pointer',
                                        opacity: isPending ? 0.6 : 1
                                    }}
                                >
                                    ✓ Resolve
                                </button>
                                <button
                                    onClick={() => setBulkAction('reassign')}
                                    aria-label="Reassign selected incidents"
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(255,255,255,0.2)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'white',
                                        fontWeight: '500',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ↻ Reassign
                                </button>
                                <button
                                    onClick={() => setBulkAction('priority')}
                                    aria-label="Update priority for selected incidents"
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(255,255,255,0.2)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'white',
                                        fontWeight: '500',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ⚡ Priority
                                </button>
                                <button
                                    onClick={() => setBulkAction('snooze')}
                                    aria-label="Snooze selected incidents"
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(255,255,255,0.2)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'white',
                                        fontWeight: '500',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ⏰ Snooze
                                </button>
                                <button
                                    onClick={() => setBulkAction('urgency')}
                                    aria-label="Update urgency for selected incidents"
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(255,255,255,0.2)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'white',
                                        fontWeight: '500',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ⚠ Urgency
                                </button>
                                <button
                                    onClick={() => setBulkAction('status')}
                                    aria-label="Update status for selected incidents"
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(255,255,255,0.2)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'white',
                                        fontWeight: '500',
                                        cursor: 'pointer'
                                    }}
                                >
                                    📊 Status
                                </button>
                                <button
                                    onClick={() => {
                                        const hasSnoozed = Array.from(selectedIds).some(id => {
                                            const incident = incidents.find(i => i.id === id);
                                            return incident?.status === 'SNOOZED';
                                        });
                                        handleBulkAction(hasSnoozed ? 'unsnooze' : 'suppress');
                                    }}
                                    aria-label="Suppress or unsnooze selected incidents"
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(255,255,255,0.2)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'white',
                                        fontWeight: '500',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🔕 Suppress
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Export Button */}
            <div style={{ padding: '0.5rem 1.25rem', background: '#f9fafb', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={handleExport}
                    aria-label="Export incidents to CSV"
                    style={{
                        padding: '0.45rem 0.85rem',
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        fontSize: '0.82rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export CSV
                </button>
            </div>

            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <div style={{ minWidth: canManageIncidents ? '1220px' : '1160px' }}>
                    {/* Header row */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns,
                            alignItems: 'center',
                            background: '#f9fafb',
                            borderBottom: '1px solid var(--border)',
                            padding: '0.25rem 0.25rem',
                        }}
                    >
                        {canManageIncidents && (
                            <div style={{ padding: '0.75rem 0.85rem' }} data-no-row-nav="true">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.size === incidents.length && incidents.length > 0}
                                    onChange={toggleSelectAll}
                                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                    aria-label="Select all incidents"
                                />
                            </div>
                        )}
                        <div style={headerCellStyle}>Incident</div>
                        <div style={headerCellStyle}>Service</div>
                        <div style={headerCellStyle}>Signals</div>
                        <div style={headerCellStyle}>Assignee</div>
                        <div style={headerCellStyle}>Created</div>
                        <div style={{ ...headerCellStyle, textAlign: 'right' }}>Actions</div>
                    </div>

                    {/* Rows */}
                    <div style={{ padding: '0.75rem', background: 'white' }}>
                        {incidents.length === 0 ? (
                            <div
                                style={{
                                    padding: '3rem 1.5rem',
                                    textAlign: 'center',
                                    color: 'var(--text-muted)',
                                    border: '1px dashed var(--border)',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)',
                                }}
                            >
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.3 }}>📋</div>
                                <p style={{ fontSize: '1.05rem', marginBottom: '0.35rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                    No incidents found
                                </p>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
                                    Try adjusting filters to see more results.
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {incidents.map((incident) => {
                                    const incidentStatus = incident.status as any; // eslint-disable-line @typescript-eslint/no-explicit-any
                                    const isSelected = selectedIds.has(incident.id);
                                    const urgencyChip = buildUrgencyChip(incident.urgency);

                                    return (
                                        <div
                                            key={incident.id}
                                            role="row"
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns,
                                                alignItems: 'center',
                                                gap: '0px',
                                                border: `1px solid ${isSelected ? 'rgba(211, 47, 47, 0.35)' : 'var(--border)'}`,
                                                borderRadius: '12px',
                                                background: isSelected ? 'rgba(211, 47, 47, 0.04)' : 'white',
                                                boxShadow: isSelected ? '0 6px 18px rgba(211, 47, 47, 0.10)' : 'var(--shadow-xs)',
                                                cursor: 'pointer',
                                                transition: 'transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease, background 0.12s ease',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isSelected) {
                                                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isSelected) {
                                                    e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }
                                            }}
                                            onClick={(e) => {
                                                const target = e.target as HTMLElement;
                                                if (target.closest('[data-no-row-nav="true"]')) return;
                                                router.push(`/incidents/${incident.id}`);
                                            }}
                                        >
                                            {canManageIncidents && (
                                                <div style={{ padding: '0.85rem 0.85rem' }} data-no-row-nav="true">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelect(incident.id)}
                                                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                                        aria-label={`Select incident ${incident.title}`}
                                                    />
                                                </div>
                                            )}

                                            {/* Incident */}
                                            <div style={{ padding: '0.85rem 0.85rem', minWidth: 0 }}>
                                                <Link
                                                    href={`/incidents/${incident.id}`}
                                                    data-no-row-nav="true"
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        display: 'block',
                                                        fontWeight: 800,
                                                        color: 'var(--text-primary)',
                                                        textDecoration: 'none',
                                                        fontSize: '0.95rem',
                                                        lineHeight: 1.25,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {incident.title}
                                                </Link>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 650 }}>
                                                        #{incident.id.slice(-5).toUpperCase()}
                                                    </span>
                                                    {urgencyChip}
                                                </div>
                                            </div>

                                            {/* Service */}
                                            <div style={{ padding: '0.85rem 0.85rem', minWidth: 0 }}>
                                                <Link
                                                    href={`/services/${incident.service.id}`}
                                                    data-no-row-nav="true"
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        color: 'var(--primary)',
                                                        textDecoration: 'none',
                                                        fontWeight: 650,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        display: 'block',
                                                    }}
                                                >
                                                    {incident.service.name}
                                                </Link>
                                            </div>

                                            {/* Signals */}
                                            <div style={{ padding: '0.85rem 0.85rem' }}>
                                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                    <StatusBadge status={incidentStatus} size="sm" showDot />
                                                    <PriorityBadge priority={incident.priority} size="sm" />
                                                    {incident.escalationStatus && (
                                                        <EscalationStatusBadge
                                                            status={incident.escalationStatus}
                                                            currentStep={incident.currentEscalationStep}
                                                            nextEscalationAt={incident.nextEscalationAt}
                                                            size="sm"
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Assignee */}
                                            <div style={{ padding: '0.85rem 0.85rem' }} data-no-row-nav="true">
                                                <AssigneeSection
                                                    assignee={incident.assignee}
                                                    assigneeId={incident.assigneeId}
                                                    team={null}
                                                    teamId={null}
                                                    users={users}
                                                    teams={[]}
                                                    incidentId={incident.id}
                                                    canManage={canManageIncidents}
                                                    variant="list"
                                                />
                                            </div>

                                            {/* Created */}
                                            <div style={{ padding: '0.85rem 0.85rem', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 550 }}>
                                                {formatDateTime(incident.createdAt, userTimeZone, { format: 'datetime' })}
                                            </div>

                                            {/* Actions */}
                                            <div
                                                style={{ padding: '0.85rem 0.85rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center' }}
                                                data-no-row-nav="true"
                                            >
                                                {incident.status !== 'RESOLVED' && (
                                                    <Link
                                                        href={`/incidents/${incident.id}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                            padding: '0.45rem 0.8rem',
                                                            background: 'var(--primary)',
                                                            border: 'none',
                                                            borderRadius: '10px',
                                                            fontSize: '0.8rem',
                                                            fontWeight: 750,
                                                            color: 'white',
                                                            textDecoration: 'none',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            boxShadow: 'var(--shadow-xs)',
                                                        }}
                                                    >
                                                        Resolve
                                                    </Link>
                                                )}

                                                {canManageIncidents && (
                                                    <details
                                                        style={{ position: 'relative' }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <summary
                                                            aria-label="More actions"
                                                            style={{
                                                                listStyle: 'none',
                                                                cursor: 'pointer',
                                                                padding: '0.45rem 0.7rem',
                                                                borderRadius: '10px',
                                                                border: '1px solid var(--border)',
                                                                background: 'white',
                                                                color: 'var(--text-secondary)',
                                                                fontSize: '0.9rem',
                                                                lineHeight: 1,
                                                                userSelect: 'none',
                                                            }}
                                                        >
                                                            ⋯
                                                        </summary>
                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                right: 0,
                                                                top: 'calc(100% + 8px)',
                                                                minWidth: '220px',
                                                                background: 'white',
                                                                border: '1px solid var(--border)',
                                                                borderRadius: '12px',
                                                                boxShadow: 'var(--shadow-lg)',
                                                                padding: '0.35rem',
                                                                zIndex: 50,
                                                            }}
                                                        >
                                                            <Link
                                                                href={`/incidents/${incident.id}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    closeDetailsMenu(e.currentTarget as unknown as HTMLElement);
                                                                }}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.5rem',
                                                                    padding: '0.55rem 0.6rem',
                                                                    borderRadius: '10px',
                                                                    textDecoration: 'none',
                                                                    color: 'var(--text-primary)',
                                                                    fontWeight: 650,
                                                                    fontSize: '0.85rem',
                                                                }}
                                                            >
                                                                View details →
                                                            </Link>

                                                            <div style={{ height: '1px', background: 'var(--border)', margin: '0.25rem 0.35rem' }} />

                                                            {incident.status !== 'ACKNOWLEDGED' && incident.status !== 'RESOLVED' && incident.status !== 'SUPPRESSED' && (
                                                                <button
                                                                    type="button"
                                                                    disabled={isPending}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        closeDetailsMenu(e.currentTarget);
                                                                        handleStatusChange(incident.id, 'ACKNOWLEDGED');
                                                                    }}
                                                                    style={{
                                                                        width: '100%',
                                                                        textAlign: 'left',
                                                                        padding: '0.55rem 0.6rem',
                                                                        borderRadius: '10px',
                                                                        border: 'none',
                                                                        background: 'transparent',
                                                                        cursor: isPending ? 'not-allowed' : 'pointer',
                                                                        fontSize: '0.85rem',
                                                                        fontWeight: 600,
                                                                        color: 'var(--text-primary)',
                                                                    }}
                                                                >
                                                                    ✓ Acknowledge
                                                                </button>
                                                            )}

                                                            {incident.status === 'ACKNOWLEDGED' && (
                                                                <button
                                                                    type="button"
                                                                    disabled={isPending}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        closeDetailsMenu(e.currentTarget);
                                                                        handleStatusChange(incident.id, 'OPEN');
                                                                    }}
                                                                    style={{
                                                                        width: '100%',
                                                                        textAlign: 'left',
                                                                        padding: '0.55rem 0.6rem',
                                                                        borderRadius: '10px',
                                                                        border: 'none',
                                                                        background: 'transparent',
                                                                        cursor: isPending ? 'not-allowed' : 'pointer',
                                                                        fontSize: '0.85rem',
                                                                        fontWeight: 600,
                                                                        color: 'var(--text-primary)',
                                                                    }}
                                                                >
                                                                    ↩ Unacknowledge
                                                                </button>
                                                            )}

                                                            {incident.status !== 'SNOOZED' && incident.status !== 'RESOLVED' && (
                                                                <button
                                                                    type="button"
                                                                    disabled={isPending}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        closeDetailsMenu(e.currentTarget);
                                                                        handleStatusChange(incident.id, 'SNOOZED');
                                                                    }}
                                                                    style={{
                                                                        width: '100%',
                                                                        textAlign: 'left',
                                                                        padding: '0.55rem 0.6rem',
                                                                        borderRadius: '10px',
                                                                        border: 'none',
                                                                        background: 'transparent',
                                                                        cursor: isPending ? 'not-allowed' : 'pointer',
                                                                        fontSize: '0.85rem',
                                                                        fontWeight: 600,
                                                                        color: 'var(--text-primary)',
                                                                    }}
                                                                >
                                                                    ⏰ Snooze
                                                                </button>
                                                            )}

                                                            {incident.status === 'SNOOZED' && (
                                                                <button
                                                                    type="button"
                                                                    disabled={isPending}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        closeDetailsMenu(e.currentTarget);
                                                                        handleStatusChange(incident.id, 'OPEN');
                                                                    }}
                                                                    style={{
                                                                        width: '100%',
                                                                        textAlign: 'left',
                                                                        padding: '0.55rem 0.6rem',
                                                                        borderRadius: '10px',
                                                                        border: 'none',
                                                                        background: 'transparent',
                                                                        cursor: isPending ? 'not-allowed' : 'pointer',
                                                                        fontSize: '0.85rem',
                                                                        fontWeight: 600,
                                                                        color: 'var(--text-primary)',
                                                                    }}
                                                                >
                                                                    🔔 Unsnooze
                                                                </button>
                                                            )}

                                                            {incident.status !== 'SUPPRESSED' && incident.status !== 'RESOLVED' && (
                                                                <button
                                                                    type="button"
                                                                    disabled={isPending}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        closeDetailsMenu(e.currentTarget);
                                                                        handleStatusChange(incident.id, 'SUPPRESSED');
                                                                    }}
                                                                    style={{
                                                                        width: '100%',
                                                                        textAlign: 'left',
                                                                        padding: '0.55rem 0.6rem',
                                                                        borderRadius: '10px',
                                                                        border: 'none',
                                                                        background: 'transparent',
                                                                        cursor: isPending ? 'not-allowed' : 'pointer',
                                                                        fontSize: '0.85rem',
                                                                        fontWeight: 600,
                                                                        color: 'var(--text-primary)',
                                                                    }}
                                                                >
                                                                    🔕 Suppress
                                                                </button>
                                                            )}

                                                            {incident.status === 'SUPPRESSED' && (
                                                                <button
                                                                    type="button"
                                                                    disabled={isPending}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        closeDetailsMenu(e.currentTarget);
                                                                        handleStatusChange(incident.id, 'OPEN');
                                                                    }}
                                                                    style={{
                                                                        width: '100%',
                                                                        textAlign: 'left',
                                                                        padding: '0.55rem 0.6rem',
                                                                        borderRadius: '10px',
                                                                        border: 'none',
                                                                        background: 'transparent',
                                                                        cursor: isPending ? 'not-allowed' : 'pointer',
                                                                        fontSize: '0.85rem',
                                                                        fontWeight: 600,
                                                                        color: 'var(--text-primary)',
                                                                    }}
                                                                >
                                                                    🔊 Unsuppress
                                                                </button>
                                                            )}
                                                        </div>
                                                    </details>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Pagination */}
            {pagination && (
                <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.totalItems}
                    itemsPerPage={pagination.itemsPerPage}
                />
            )}
        </div>
    );
}
