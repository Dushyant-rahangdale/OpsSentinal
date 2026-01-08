'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTimezone } from '@/contexts/TimezoneContext';
import { formatDateTime } from '@/lib/timezone';

const timeRangeOptions = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' },
];

export default function DashboardTimeRange() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { userTimeZone } = useTimezone();
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const currentRange = searchParams.get('range') || '30';
  const customStartParam = searchParams.get('startDate');
  const customEndParam = searchParams.get('endDate');

  const handleRangeChange = (range: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (range === 'all') {
      params.set('range', 'all');
      params.delete('startDate');
      params.delete('endDate');
    } else if (range === 'custom') {
      setShowCustomPicker(true);
      return;
    } else {
      params.set('range', range);
      params.delete('startDate');
      params.delete('endDate');
    }
    params.delete('page'); // Reset to page 1 when changing range
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleCustomDateApply = () => {
    if (customStart && customEnd) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('range', 'custom');
      params.set('startDate', customStart);
      params.set('endDate', customEnd);
      params.delete('page');
      router.push(`${pathname}?${params.toString()}`);
      setShowCustomPicker(false);
    }
  };

  const handleCustomDateClear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('range');
    params.delete('startDate');
    params.delete('endDate');
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
    setShowCustomPicker(false);
    setCustomStart('');
    setCustomEnd('');
  };

  const isSelected = (value: string) => {
    return currentRange === value || (value === 'custom' && customStartParam);
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
        flexWrap: 'wrap',
        position: 'relative',
      }}
    >
      <span style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.95)', fontWeight: '600' }}>
        Time Range:
      </span>
      {timeRangeOptions
        .filter(opt => opt.value !== 'custom')
        .map(option => (
          <button
            key={option.value}
            onClick={() => handleRangeChange(option.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              border: isSelected(option.value)
                ? '1px solid rgba(255, 255, 255, 0.4)'
                : '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
              background: isSelected(option.value) ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              color: isSelected(option.value) ? 'white' : 'rgba(255, 255, 255, 0.7)',
              fontWeight: isSelected(option.value) ? '700' : '500',
              transition: 'all 0.2s ease',
              backdropFilter: isSelected(option.value) ? 'blur(8px)' : 'none',
            }}
            onMouseEnter={e => {
              if (!isSelected(option.value)) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }
            }}
            onMouseLeave={e => {
              if (!isSelected(option.value)) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {option.label}
          </button>
        ))}
      {customStartParam && customEndParam && (
        <button
          onClick={() => handleRangeChange('custom')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            cursor: 'pointer',
            background: 'rgba(255, 255, 255, 0.15)',
            color: 'white',
            fontWeight: '700',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(8px)',
          }}
        >
          {formatDateTime(customStartParam, userTimeZone, { format: 'date' })} -{' '}
          {formatDateTime(customEndParam, userTimeZone, { format: 'date' })}
        </button>
      )}

      {showCustomPicker && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '0.5rem',
            background: 'white',
            padding: '1rem',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border)',
            zIndex: 1000,
            minWidth: '300px',
          }}
        >
          <div style={{ marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: '600' }}>
            Select Custom Date Range
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  marginBottom: '0.25rem',
                  fontWeight: '600',
                }}
              >
                Start Date
              </label>
              <input
                type="date"
                value={customStart || customStartParam || ''}
                onChange={e => setCustomStart(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  marginBottom: '0.25rem',
                  fontWeight: '600',
                }}
              >
                End Date
              </label>
              <input
                type="date"
                value={customEnd || customEndParam || ''}
                onChange={e => setCustomEnd(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setShowCustomPicker(false);
                if (!customStartParam) {
                  setCustomStart('');
                  setCustomEnd('');
                }
              }}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: '600',
              }}
            >
              Cancel
            </button>
            {customStartParam && (
              <button
                onClick={handleCustomDateClear}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: 'var(--danger)',
                }}
              >
                Clear
              </button>
            )}
            <button
              onClick={handleCustomDateApply}
              disabled={!customStart || !customEnd}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '6px',
                background: customStart && customEnd ? 'var(--primary-color)' : '#ccc',
                color: 'white',
                cursor: customStart && customEnd ? 'pointer' : 'not-allowed',
                fontSize: '0.85rem',
                fontWeight: '600',
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
