'use client';

import { ReactNode } from 'react';
import Skeleton from './Skeleton';

interface Column<T = any> {
  key: string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T, index: number) => void;
  className?: string;
}

export default function Table<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  className = '',
}: TableProps<T>) {
  if (loading) {
    return (
      <div className={`ui-table ${className}`} style={{ width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: 'var(--spacing-4)',
                    textAlign: col.align || 'left',
                    background: 'var(--color-neutral-50)',
                    borderBottom: '2px solid var(--border)',
                    fontWeight: 600,
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: 'var(--spacing-4)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <Skeleton variant="text" width="80%" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className="ui-table-empty"
        style={{
          padding: 'var(--spacing-12)',
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={`ui-table ${className}`}
      style={{
        width: '100%',
        overflowX: 'auto',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-secondary)',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: 'var(--spacing-4)',
                  textAlign: col.align || 'left',
                  background: 'var(--color-neutral-50)',
                  borderBottom: '2px solid var(--border)',
                  fontWeight: 600,
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-primary)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={index}
              onClick={() => onRowClick?.(item, index)}
              style={{
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background-color var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                if (onRowClick) {
                  e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '';
              }}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{
                    padding: 'var(--spacing-4)',
                    borderBottom: '1px solid var(--border)',
                    textAlign: col.align || 'left',
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  {col.render ? col.render(item, index) : item[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


