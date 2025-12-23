'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDateFriendly } from '@/lib/date-format';
import StatusBadge from './StatusBadge';
import EscalationStatusBadge from './EscalationStatusBadge';
import PriorityBadge from './PriorityBadge';
import AssigneeSection from './AssigneeSection';
import { Incident, Service } from '@prisma/client';
import { updateIncidentStatus } from '@/app/(app)/incidents/actions';
import { bulkAcknowledge, bulkResolve, bulkReassign, bulkUpdatePriority, bulkSnooze, bulkUnsnooze, bulkSuppress, bulkUnsuppress } from '@/app/(app)/incidents/bulk-actions';
import { useToast } from '../ToastProvider';
import Pagination from './Pagination';

type IncidentWithRelations = Incident & {
    service: Service;
    assignee: { id: string; name: string; email: string } | null;
};

type IncidentsListTableProps = {
    incidents: IncidentWithRelations[];
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
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkAction, setBulkAction] = useState<'reassign' | 'priority' | 'snooze' | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleStatusChange = async (incidentId: string, status: 'ACKNOWLEDGED' | 'RESOLVED' | 'SNOOZED' | 'SUPPRESSED') => {
        startTransition(async () => {
            try {
                await updateIncidentStatus(incidentId, status);
                showToast(`Incident ${status.toLowerCase()} successfully`, 'success');
                router.refresh();
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Failed to update status', 'error');
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

    const handleBulkAction = async (action: 'acknowledge' | 'resolve' | 'reassign' | 'priority' | 'snooze' | 'unsnooze' | 'suppress' | 'unsuppress', value?: string | number) => {
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
                showToast(error instanceof Error ? error.message : 'Failed to update incidents', 'error');
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

    return (
        <div className="glass-panel" style={{ background: 'white', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
            {/* Bulk Actions Bar */}
            {(selectedIds.size > 0 || bulkAction) && (
                <div style={{
                    padding: '1rem 1.5rem',
                    background: 'linear-gradient(90deg, var(--primary-dark) 0%, var(--primary) 100%)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap'
                }}>
                    <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>
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
            <div style={{ padding: '0.75rem 1.5rem', background: '#f9fafb', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={handleExport}
                    aria-label="Export incidents to CSV"
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
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

            <div style={{
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch'
            }}>
                <table style={{
                    width: '100%',
                    minWidth: '1200px',
                    borderCollapse: 'collapse',
                    fontSize: '0.9rem'
                }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '2px solid var(--border)' }}>
                        <tr>
                            {canManageIncidents && (
                                <th style={{ width: '50px', padding: '1rem', textAlign: 'left' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === incidents.length && incidents.length > 0}
                                        onChange={toggleSelectAll}
                                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                    />
                                </th>
                            )}
                            <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Status
                            </th>
                            <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Priority
                            </th>
                            <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Incident
                            </th>
                            <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Service
                            </th>
                            <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Assignee
                            </th>
                            <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Created
                            </th>
                            <th style={{ textAlign: 'right', padding: '1rem', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {incidents.map((incident) => (
                            <tr
                                key={incident.id}
                                style={{
                                    borderBottom: '1px solid var(--border)',
                                    cursor: 'pointer',
                                    transition: 'background 0.15s',
                                    background: selectedIds.has(incident.id) ? '#fef3f3' : 'transparent'
                                }}
                                onMouseEnter={(e) => {
                                    if (!selectedIds.has(incident.id)) {
                                        e.currentTarget.style.background = '#f9fafb';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!selectedIds.has(incident.id)) {
                                        e.currentTarget.style.background = 'transparent';
                                    }
                                }}
                                onClick={(e) => {
                                    // Don't navigate if clicking checkbox or action buttons
                                    if ((e.target as HTMLElement).tagName !== 'INPUT' &&
                                        (e.target as HTMLElement).tagName !== 'BUTTON' &&
                                        (e.target as HTMLElement).tagName !== 'SELECT' &&
                                        !(e.target as HTMLElement).closest('button') &&
                                        !(e.target as HTMLElement).closest('select')) {
                                        router.push(`/incidents/${incident.id}`);
                                    }
                                }}
                            >
                                {canManageIncidents && (
                                    <td style={{ padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(incident.id)}
                                            onChange={() => toggleSelect(incident.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                        />
                                    </td>
                                )}
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <StatusBadge status={incident.status as any} size="sm" showDot />
                                        {incident.escalationStatus && (
                                            <EscalationStatusBadge
                                                status={incident.escalationStatus}
                                                currentStep={incident.currentEscalationStep}
                                                nextEscalationAt={incident.nextEscalationAt}
                                                size="sm"
                                            />
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <PriorityBadge priority={incident.priority} size="sm" />
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <Link
                                        href={`/incidents/${incident.id}`}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            fontWeight: '700',
                                            color: 'var(--primary)',
                                            textDecoration: 'none',
                                            fontSize: '0.95rem',
                                            display: 'block',
                                            marginBottom: '0.25rem'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                    >
                                        {incident.title}
                                    </Link>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        #{incident.id.slice(-5).toUpperCase()}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: incident.urgency === 'HIGH' ? 'var(--danger)' : 'var(--warning)', fontWeight: 600, marginTop: '0.25rem' }}>
                                        {incident.urgency}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <Link
                                        href={`/services/${incident.service.id}`}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}
                                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                    >
                                        {incident.service.name}
                                    </Link>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <AssigneeSection
                                            assignee={incident.assignee}
                                            assigneeId={incident.assigneeId}
                                            users={users}
                                            incidentId={incident.id}
                                            canManage={canManageIncidents}
                                            variant="list"
                                        />
                                    </div>
                                </td>
                                <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    {(() => {
                                        const formatted = formatDateFriendly(incident.createdAt);
                                        // formatDateFriendly returns "DD/MM/YYYY HH:MM"
                                        const [datePart, timePart] = formatted.split(' ');
                                        return (
                                            <>
                                                <div>{datePart || formatted}</div>
                                                {timePart && (
                                                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                                        {timePart}
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    {canManageIncidents && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}
                                        >
                                            {incident.status !== 'ACKNOWLEDGED' && incident.status !== 'RESOLVED' && incident.status !== 'SUPPRESSED' && (
                                                <button
                                                    onClick={() => handleStatusChange(incident.id, 'ACKNOWLEDGED')}
                                                    disabled={isPending}
                                                    aria-label={`Acknowledge incident ${incident.title}`}
                                                    style={{
                                                        padding: '0.4rem 0.75rem',
                                                        background: 'linear-gradient(180deg, #fff4cc 0%, #ffe9a8 100%)',
                                                        border: '1px solid #f6c453',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        color: '#b45309',
                                                        cursor: isPending ? 'not-allowed' : 'pointer',
                                                        opacity: isPending ? 0.6 : 1
                                                    }}
                                                    title="Acknowledge"
                                                >
                                                    ✓ Ack
                                                </button>
                                            )}
                                            {incident.status !== 'SNOOZED' && incident.status !== 'RESOLVED' && (
                                                <button
                                                    onClick={() => handleStatusChange(incident.id, 'SNOOZED')}
                                                    disabled={isPending}
                                                    aria-label={`Snooze incident ${incident.title}`}
                                                    style={{
                                                        padding: '0.4rem 0.75rem',
                                                        background: '#f3f4f6',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        color: 'var(--text-secondary)',
                                                        cursor: isPending ? 'not-allowed' : 'pointer',
                                                        opacity: isPending ? 0.6 : 1
                                                    }}
                                                    title="Snooze"
                                                >
                                                    ⏰ Snooze
                                                </button>
                                            )}
                                            {incident.status === 'SNOOZED' && (
                                                <button
                                                    onClick={() => handleStatusChange(incident.id, 'OPEN')}
                                                    disabled={isPending}
                                                    aria-label={`Unsnooze incident ${incident.title}`}
                                                    style={{
                                                        padding: '0.4rem 0.75rem',
                                                        background: '#feecec',
                                                        border: '1px solid rgba(211,47,47,0.25)',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        color: 'var(--danger)',
                                                        cursor: isPending ? 'not-allowed' : 'pointer',
                                                        opacity: isPending ? 0.6 : 1
                                                    }}
                                                    title="Unsnooze"
                                                >
                                                    🔔 Unsnooze
                                                </button>
                                            )}
                                            {incident.status !== 'SUPPRESSED' && incident.status !== 'RESOLVED' && (
                                                <button
                                                    onClick={() => handleStatusChange(incident.id, 'SUPPRESSED')}
                                                    disabled={isPending}
                                                    aria-label={`Suppress incident ${incident.title}`}
                                                    style={{
                                                        padding: '0.4rem 0.75rem',
                                                        background: '#f3f4f6',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        color: 'var(--text-secondary)',
                                                        cursor: isPending ? 'not-allowed' : 'pointer',
                                                        opacity: isPending ? 0.6 : 1
                                                    }}
                                                    title="Suppress"
                                                >
                                                    🔕 Suppress
                                                </button>
                                            )}
                                            {incident.status === 'SUPPRESSED' && (
                                                <button
                                                    onClick={() => handleStatusChange(incident.id, 'OPEN')}
                                                    disabled={isPending}
                                                    aria-label={`Unsuppress incident ${incident.title}`}
                                                    style={{
                                                        padding: '0.4rem 0.75rem',
                                                        background: '#feecec',
                                                        border: '1px solid rgba(211,47,47,0.25)',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        color: 'var(--danger)',
                                                        cursor: isPending ? 'not-allowed' : 'pointer',
                                                        opacity: isPending ? 0.6 : 1
                                                    }}
                                                    title="Unsuppress"
                                                >
                                                    🔊 Unsuppress
                                                </button>
                                            )}
                                            {incident.status !== 'RESOLVED' && (
                                                <Link
                                                    href={`/incidents/${incident.id}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    aria-label={`Resolve incident ${incident.title}`}
                                                    style={{
                                                        padding: '0.4rem 0.75rem',
                                                        background: 'var(--primary)',
                                                        border: 'none',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        color: 'white',
                                                        textDecoration: 'none',
                                                        display: 'inline-block'
                                                    }}
                                                >
                                                    Resolve
                                                </Link>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {incidents.length === 0 && (
                            <tr>
                                <td colSpan={canManageIncidents ? 8 : 7} style={{ padding: 0 }}>
                                    <div style={{
                                        padding: '4rem 2rem',
                                        textAlign: 'center',
                                        color: 'var(--text-muted)',
                                        background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)',
                                    }}>
                                        <div style={{
                                            fontSize: '3rem',
                                            marginBottom: '1rem',
                                            opacity: 0.3
                                        }}>📋</div>
                                        <p style={{
                                            fontSize: '1.1rem',
                                            marginBottom: '0.5rem',
                                            fontWeight: '600',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            No incidents found
                                        </p>
                                        <p style={{
                                            fontSize: '0.9rem',
                                            color: 'var(--text-muted)'
                                        }}>
                                            Try adjusting your filters to see more results.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
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
