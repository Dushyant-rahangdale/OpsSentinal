'use client';

import { useState } from 'react';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';

type ExportProps = {
  incidents: any[];
  filters: {
    status?: string;
    service?: string;
    assignee?: string;
    range?: string;
  };
  metrics: {
    totalOpen: number;
    totalResolved: number;
    totalAcknowledged: number;
    unassigned: number;
  };
};

export default function DashboardExport({ incidents, filters, metrics }: ExportProps) {
  const { userTimeZone } = useTimezone();
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = () => {
    setIsExporting(true);
    
    const csvRows: string[] = [];
    
    // Header
    csvRows.push('OpsGuard Dashboard Export');
    csvRows.push(`Generated: ${formatDateTime(new Date(), userTimeZone, { format: 'datetime' })}`);
    csvRows.push('');
    
    // Filters
    csvRows.push('Active Filters:');
    if (filters.status) csvRows.push(`Status: ${filters.status}`);
    if (filters.service) csvRows.push(`Service: ${filters.service}`);
    if (filters.assignee) csvRows.push(`Assignee: ${filters.assignee}`);
    if (filters.range) csvRows.push(`Time Range: ${filters.range} days`);
    csvRows.push('');
    
    // Metrics Summary
    csvRows.push('Metrics Summary:');
    csvRows.push(`Open Incidents,${metrics.totalOpen}`);
    csvRows.push(`Resolved Incidents,${metrics.totalResolved}`);
    csvRows.push(`Acknowledged Incidents,${metrics.totalAcknowledged}`);
    csvRows.push(`Unassigned Incidents,${metrics.unassigned}`);
    csvRows.push('');
    
    // Incidents Data
    csvRows.push('Incidents:');
    csvRows.push('ID,Title,Status,Urgency,Service,Assignee,Created At');
    incidents.forEach(incident => {
      const row = [
        incident.id,
        `"${incident.title.replace(/"/g, '""')}"`,
        incident.status,
        incident.urgency || 'N/A',
        incident.service?.name || 'N/A',
        incident.assignee?.name || 'Unassigned',
        formatDateTime(incident.createdAt, userTimeZone, { format: 'datetime' })
      ];
      csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `dashboard-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => setIsExporting(false), 500);
  };

  return (
    <button
      onClick={exportToCSV}
      disabled={isExporting}
      style={{
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        fontSize: '0.85rem',
        border: 'none',
        background: 'white',
        cursor: isExporting ? 'not-allowed' : 'pointer',
        color: '#1f2937',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        opacity: isExporting ? 0.6 : 1,
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}
      title="Export dashboard data to CSV"
      onMouseEnter={(e) => {
        if (!isExporting) {
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {isExporting ? 'Exporting...' : 'Export CSV'}
    </button>
  );
}

