'use client';

import { useState, useTransition, memo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { bulkAcknowledge, bulkResolve } from '@/app/(app)/incidents/bulk-actions';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';
import styles from './incidents/IncidentTable.module.css';

type Incident = {
  id: string;
  title: string;
  status: string;
  urgency?: string;
  service: { name: string };
  assignee: { name: string } | null;
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
    router.push(newUrl);
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
      const result = await bulkAcknowledge(Array.from(selectedIds));
      if (result.success) {
        setSelectedIds(new Set());
      } else {
        // eslint-disable-next-line no-alert
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
        // eslint-disable-next-line no-alert
        alert(result.error || 'Failed to resolve incidents');
      }
    });
  };

  const renderSortArrow = () => (
    <span className={styles.sortIcon}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
  );

  return (
    <div className={styles.container}>
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className={styles.bulkActionsBar}>
          <span className={styles.selectedCount}>
            {selectedIds.size} incident{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className={styles.bulkActionsButtons}>
            <button
              onClick={handleBulkAcknowledge}
              disabled={isPending}
              className={styles.bulkAckButton}
            >
              ✓ Acknowledge Selected
            </button>
            <button
              onClick={handleBulkResolve}
              disabled={isPending}
              className={styles.bulkResolveButton}
            >
              ✓ Resolve Selected
            </button>
          </div>
        </div>
      )}

      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th className={styles.checkboxCell}>
              <input
                type="checkbox"
                checked={selectedIds.size === incidents.length && incidents.length > 0}
                onChange={toggleAll}
                className={styles.checkbox}
              />
            </th>
            <th className={styles.th}>
              <button onClick={() => handleSortClick('status')} className={styles.sortButton}>
                Status
                {sortBy === 'status' && renderSortArrow()}
              </button>
            </th>
            <th className={styles.th}>
              <button onClick={() => handleSortClick('urgency')} className={styles.sortButton}>
                Urgency
                {sortBy === 'urgency' && renderSortArrow()}
              </button>
            </th>
            <th className={styles.th}>
              <button onClick={() => handleSortClick('title')} className={styles.sortButton}>
                Incident
                {sortBy === 'title' && renderSortArrow()}
              </button>
            </th>
            <th className={styles.th}>Service</th>
            <th className={styles.th}>Assignee</th>
            <th className={styles.th}>
              <button onClick={() => handleSortClick('createdAt')} className={styles.sortButton}>
                Created
                {sortBy === 'createdAt' && renderSortArrow()}
              </button>
            </th>
            <th className={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map(incident => (
            <tr key={incident.id} className={styles.row}>
              <td className={styles.td}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(incident.id)}
                  onChange={() => toggleIncident(incident.id)}
                  className={styles.checkbox}
                />
              </td>
              <td className={styles.td}>
                <span
                  className={`
                                    ${styles.statusBadge}
                                    ${incident.status === 'RESOLVED' ? styles.statusResolved : ''}
                                    ${incident.status === 'ACKNOWLEDGED' ? styles.statusAcknowledged : ''}
                                    ${incident.status === 'OPEN' ? styles.statusOpen : ''}
                                `}
                >
                  {incident.status}
                </span>
              </td>
              <td className={styles.td}>
                {incident.urgency && (
                  <span
                    className={`
                                        ${styles.urgencyBadge}
                                        ${incident.urgency === 'HIGH' ? styles.urgencyHigh : styles.urgencyLow}
                                    `}
                  >
                    {incident.urgency}
                  </span>
                )}
              </td>
              <td className={styles.td}>
                <Link href={`/incidents/${incident.id}`} className={styles.incidentLink}>
                  {incident.title}
                </Link>
                <div className={styles.incidentId}>#{incident.id.slice(-5).toUpperCase()}</div>
              </td>
              <td className={styles.td}>{incident.service.name}</td>
              <td className={styles.td}>
                {incident.assignee ? (
                  <div className={styles.assignee}>
                    <div className={styles.assigneeAvatar}>{incident.assignee.name.charAt(0)}</div>
                    {incident.assignee.name}
                  </div>
                ) : (
                  <span className={styles.unassigned}>Unassigned</span>
                )}
              </td>
              <td className={`${styles.td} ${styles.timestamp}`}>
                {formatDateTime(incident.createdAt, userTimeZone, { format: 'datetime' })}
              </td>
              <td className={styles.td}>
                <div className={styles.actions}>
                  <Link href={`/incidents/${incident.id}`} className={styles.viewButton}>
                    View
                  </Link>
                  {incident.status === 'RESOLVED' && (
                    <Link href={`/postmortems/${incident.id}`} className={styles.postmortemButton}>
                      Postmortem
                    </Link>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {incidents.length === 0 && (
            <tr className={styles.emptyStateRow}>
              <td colSpan={8}>
                <div className={styles.emptyStateContent}>
                  <div className={styles.emptyStateIcon}>📊</div>
                  <div>
                    <div className={styles.emptyStateTitle}>No incidents found</div>
                    <div className={styles.emptyStateText}>
                      No incidents match your current filters. Try adjusting your search criteria.
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});
