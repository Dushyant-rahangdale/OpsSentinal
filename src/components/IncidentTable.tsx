'use client';

import { useState, useTransition, memo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { bulkAcknowledge, bulkResolve } from '@/app/(app)/incidents/bulk-actions';
import { updateIncidentStatus } from '@/app/(app)/incidents/actions';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';
import StatusBadge from '@/components/incident/StatusBadge';
import { useToast } from '@/components/ToastProvider';
import { getDefaultAvatar } from '@/lib/avatar';

type Incident = {
  id: string;
  title: string;
  status: string;
  urgency?: string;
  service: { name: string };
  assignee: { name: string; avatarUrl?: string | null; gender?: string | null } | null;
  createdAt: Date;
};

type IncidentTableProps = {
  incidents: Incident[];
  sortBy?: string;
  sortOrder?: string;
};

export default memo(function IncidentTable({
  incidents,
  sortBy = 'createdAt',
  sortOrder = 'desc',
}: IncidentTableProps) {
  const { userTimeZone } = useTimezone();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { showToast } = useToast();

  // Handle sort click
  const handleSortClick = (newSortBy: string) => {
    const params = new URLSearchParams(searchParams.toString());

    // Always reset page when sorting
    params.delete('page');

    if (sortBy === newSortBy && sortOrder === 'asc') {
      // If already sorted by this field ascending, switch to descending
      params.set('sortBy', newSortBy);
      params.set('sortOrder', 'desc');
    } else if (sortBy === newSortBy && sortOrder === 'desc') {
      // If already sorted by this field descending, remove sort (go to default)
      params.delete('sortBy');
      params.delete('sortOrder');
    } else {
      // New field, sort ascending
      params.set('sortBy', newSortBy);
      params.set('sortOrder', 'asc');
    }

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname || '/';
    router.push(newUrl, { scroll: false });
  };

  const renderSortArrow = () => (sortOrder === 'asc' ? '↑' : '↓');

  const buildUrgencyChip = (urgency: string | null | undefined) => {
    if (!urgency) return null;
    const u = urgency.toUpperCase();
    const config =
      u === 'HIGH'
        ? { bg: 'rgba(239, 68, 68, 0.10)', border: 'rgba(239, 68, 68, 0.28)', color: '#b91c1c' }
        : u === 'MEDIUM'
          ? { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.28)', color: '#b45309' }
          : { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.28)', color: '#15803d' };

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
          textTransform: 'uppercase',
        }}
        title={`Urgency: ${u}`}
      >
        {u}
      </span>
    );
  };

  const getStatusAccent = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { accent: 'rgba(239, 68, 68, 0.7)', glow: 'rgba(239, 68, 68, 0.10)' };
      case 'ACKNOWLEDGED':
        return { accent: 'rgba(245, 158, 11, 0.7)', glow: 'rgba(245, 158, 11, 0.10)' };
      case 'RESOLVED':
        return { accent: 'rgba(34, 197, 94, 0.7)', glow: 'rgba(34, 197, 94, 0.10)' };
      default:
        return { accent: 'rgba(148, 163, 184, 0.9)', glow: 'rgba(148, 163, 184, 0.08)' };
    }
  };

  const closeDetailsMenu = (el: HTMLElement) => {
    const details = el.closest('details') as HTMLDetailsElement | null;
    if (details) details.open = false;
  };

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
      try {
        const result = await bulkAcknowledge(Array.from(selectedIds));
        if (result.success) {
          showToast(`${result.count} incident(s) acknowledged`, 'success');
          setSelectedIds(new Set());
          router.refresh();
        } else {
          showToast(result.error || 'Failed to acknowledge incidents', 'error');
        }
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Failed to acknowledge incidents', 'error');
      }
    });
  };

  const handleBulkResolve = () => {
    startTransition(async () => {
      try {
        const result = await bulkResolve(Array.from(selectedIds));
        if (result.success) {
          showToast(`${result.count} incident(s) resolved`, 'success');
          setSelectedIds(new Set());
          router.refresh();
        } else {
          showToast(result.error || 'Failed to resolve incidents', 'error');
        }
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Failed to resolve incidents', 'error');
      }
    });
  };

  const handleStatusChange = async (
    incidentId: string,
    status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SNOOZED' | 'SUPPRESSED'
  ) => {
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

  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        details.dashboard-incident-menu > summary::-webkit-details-marker { display: none; }
        details.dashboard-incident-menu > summary { list-style: none; }
      `}</style>
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'linear-gradient(90deg, var(--primary-dark) 0%, var(--primary-color) 100%)',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{selectedIds.size} selected</span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleBulkAcknowledge}
              disabled={isPending}
              style={{
                padding: '0.45rem 0.8rem',
                background: 'rgba(255,255,255,0.18)',
                border: '1px solid rgba(255,255,255,0.28)',
                borderRadius: '10px',
                color: 'white',
                fontWeight: 650,
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.6 : 1,
                fontSize: '0.82rem',
              }}
            >
              ✓ Acknowledge
            </button>
            <button
              onClick={handleBulkResolve}
              disabled={isPending}
              style={{
                padding: '0.45rem 0.8rem',
                background: 'rgba(255,255,255,0.92)',
                border: 'none',
                borderRadius: '10px',
                color: 'var(--primary-color)',
                fontWeight: 750,
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.6 : 1,
                fontSize: '0.82rem',
              }}
            >
              ✓ Resolve
            </button>
          </div>
        </div>
      )}

      {/* Sort toolbar */}
      <div
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--glass-border)',
          background: 'var(--glass-bg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
            Sort:
          </span>
          {[
            { key: 'createdAt', label: 'Created' },
            { key: 'status', label: 'Status' },
            { key: 'urgency', label: 'Urgency' },
            { key: 'title', label: 'Title' },
          ].map(opt => {
            const active = sortBy === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => handleSortClick(opt.key)}
                style={{
                  padding: '0.3rem 0.55rem',
                  borderRadius: '9999px',
                  border: `1px solid ${active ? 'rgba(211, 47, 47, 0.25)' : 'var(--border)'}`,
                  background: active ? 'rgba(211, 47, 47, 0.08)' : 'white',
                  color: active ? 'var(--primary-color)' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  gap: '0.35rem',
                  alignItems: 'center',
                }}
              >
                {opt.label}
                {active && (
                  <span style={{ color: 'var(--primary-color)' }}>{renderSortArrow()}</span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={toggleAll}
            className="glass-button"
            style={{ padding: '0.45rem 0.75rem' }}
            disabled={incidents.length === 0}
          >
            {selectedIds.size === incidents.length && incidents.length > 0
              ? 'Clear selection'
              : 'Select page'}
          </button>
        </div>
      </div>

      {/* Card list */}
      <div style={{ padding: '0.9rem 1rem', background: 'var(--glass-bg)' }}>
        {incidents.length === 0 ? (
          <div
            style={{
              padding: '2.25rem 1.5rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              border: '1px dashed var(--border)',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)',
            }}
          >
            <div style={{ fontSize: '2.25rem', marginBottom: '0.75rem', opacity: 0.3 }}>📊</div>
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 750,
                color: 'var(--text-secondary)',
                marginBottom: '0.25rem',
              }}
            >
              No incidents found
            </div>
            <div style={{ fontSize: '0.85rem' }}>
              No incidents match your current filters. Try adjusting your search criteria.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {incidents.map(incident => {
              const isSelected = selectedIds.has(incident.id);
              const accent = getStatusAccent(incident.status);
              const urgencyChip = buildUrgencyChip(incident.urgency);

              return (
                <div
                  key={incident.id}
                  style={{
                    border: `1px solid ${isSelected ? 'rgba(211, 47, 47, 0.35)' : 'var(--border)'}`,
                    borderRadius: '14px',
                    background: isSelected ? 'rgba(211, 47, 47, 0.03)' : 'white',
                    boxShadow: isSelected
                      ? `0 12px 26px rgba(15, 23, 42, 0.10), 0 0 0 4px ${accent.glow}`
                      : 'var(--shadow-xs)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition:
                      'transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease, background 0.12s ease',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                  onClick={e => {
                    const target = e.target as HTMLElement;
                    if (target.closest('[data-no-row-nav="true"]')) return;
                    router.push(`/incidents/${incident.id}`);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/incidents/${incident.id}`);
                    }
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.85rem',
                      padding: '0.9rem 1rem',
                      alignItems: 'flex-start',
                      borderLeft: `4px solid ${accent.accent}`,
                    }}
                  >
                    <div data-no-row-nav="true" style={{ paddingTop: '0.15rem' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleIncident(incident.id)}
                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                        aria-label={`Select incident ${incident.title}`}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <Link
                            href={`/incidents/${incident.id}`}
                            data-no-row-nav="true"
                            onClick={e => e.stopPropagation()}
                            style={{
                              display: 'block',
                              fontWeight: 850,
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

                          <div
                            style={{
                              display: 'flex',
                              gap: '0.6rem',
                              alignItems: 'center',
                              marginTop: '0.35rem',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '0.8rem',
                                color: 'var(--text-muted)',
                                fontWeight: 650,
                              }}
                            >
                              #{incident.id.slice(-5).toUpperCase()}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              •
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {formatDateTime(incident.createdAt, userTimeZone, {
                                format: 'short',
                              })}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              •
                            </span>
                            <span
                              style={{
                                fontSize: '0.8rem',
                                color: 'var(--text-secondary)',
                                fontWeight: 650,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '360px',
                              }}
                              title={incident.service.name}
                            >
                              {incident.service.name}
                            </span>
                          </div>
                        </div>

                        <div
                          data-no-row-nav="true"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            flexWrap: 'wrap',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <Link
                            href={`/incidents/${incident.id}`}
                            onClick={e => e.stopPropagation()}
                            style={{
                              padding: '0.45rem 0.8rem',
                              background: 'var(--primary-color)',
                              border: 'none',
                              borderRadius: '10px',
                              fontSize: '0.8rem',
                              fontWeight: 800,
                              color: 'white',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: 'var(--shadow-xs)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Open
                          </Link>

                          <details
                            className="dashboard-incident-menu"
                            style={{ position: 'relative' }}
                            onClick={e => e.stopPropagation()}
                          >
                            <summary
                              aria-label="More actions"
                              style={{
                                cursor: 'pointer',
                                padding: '0.45rem 0.7rem',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                background: 'white',
                                color: 'var(--text-secondary)',
                                fontSize: '0.9rem',
                                lineHeight: 1,
                                userSelect: 'none',
                                boxShadow: 'var(--shadow-xs)',
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
                                onClick={e => {
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
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = 'var(--color-neutral-50)';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                View details →
                              </Link>

                              <div
                                style={{
                                  height: '1px',
                                  background: 'var(--border)',
                                  margin: '0.25rem 0.35rem',
                                }}
                              />

                              {incident.status !== 'RESOLVED' && (
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={e => {
                                    e.stopPropagation();
                                    closeDetailsMenu(e.currentTarget);
                                    handleStatusChange(incident.id, 'RESOLVED');
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
                                    fontWeight: 700,
                                    color: 'var(--primary-color)',
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.background = 'var(--primary-light)';
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.background = 'transparent';
                                  }}
                                >
                                  ✓ Resolve
                                </button>
                              )}

                              {incident.status !== 'ACKNOWLEDGED' &&
                                incident.status !== 'RESOLVED' && (
                                  <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={e => {
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
                                    onMouseEnter={e => {
                                      e.currentTarget.style.background = 'var(--color-neutral-50)';
                                    }}
                                    onMouseLeave={e => {
                                      e.currentTarget.style.background = 'transparent';
                                    }}
                                  >
                                    ✓ Acknowledge
                                  </button>
                                )}

                              {incident.status === 'ACKNOWLEDGED' && (
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={e => {
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
                                  onMouseEnter={e => {
                                    e.currentTarget.style.background = 'var(--color-neutral-50)';
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.background = 'transparent';
                                  }}
                                >
                                  ↩ Unacknowledge
                                </button>
                              )}

                              {incident.status === 'RESOLVED' && (
                                <Link
                                  href={`/postmortems/${incident.id}`}
                                  onClick={e => {
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
                                    color: 'var(--primary-color)',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.background = 'var(--primary-light)';
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.background = 'transparent';
                                  }}
                                >
                                  View postmortem →
                                </Link>
                              )}
                            </div>
                          </details>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: '0.6rem',
                          display: 'flex',
                          gap: '0.4rem',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                        }}
                      >
                        <StatusBadge status={incident.status as any} size="sm" showDot />
                        {urgencyChip}
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>•</span>
                        {incident.assignee ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <img
                              src={
                                incident.assignee.avatarUrl ||
                                getDefaultAvatar(incident.assignee.gender, incident.assignee.name)
                              }
                              alt={incident.assignee.name}
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                              }}
                            />
                            <span
                              style={{
                                color: 'var(--text-secondary)',
                                fontSize: '0.85rem',
                                fontWeight: 650,
                              }}
                            >
                              {incident.assignee.name}
                            </span>
                          </div>
                        ) : (
                          <span
                            style={{
                              color: 'var(--text-secondary)',
                              fontSize: '0.85rem',
                              fontWeight: 650,
                            }}
                          >
                            Unassigned
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
