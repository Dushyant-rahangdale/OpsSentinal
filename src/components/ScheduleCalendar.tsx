'use client';

import { useMemo, useState } from 'react';
import { formatDateTime } from '@/lib/timezone';
import { getDefaultAvatar } from '@/lib/avatar';

type CalendarShift = {
  id: string;
  start: string;
  end: string;
  label: string;
  user?: {
    name: string;
    avatarUrl?: string | null;
    gender?: string | null;
  };
};

type CalendarCell = {
  date: Date;
  inMonth: boolean;
  shifts: CalendarShift[];
};

type ScheduleCalendarProps = {
  shifts: CalendarShift[];
  timeZone: string;
};

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildCalendar(baseDate: Date, shifts: CalendarShift[]) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const cells: CalendarCell[] = [];

  const shiftsForDate = (date: Date) => {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

    // Filter shifts that overlap with this day
    const overlapping = shifts.filter(shift => {
      const start = new Date(shift.start);
      const end = new Date(shift.end);
      return start < dayEnd && end > dayStart;
    });

    // Group by layer - show only ONE shift per layer per day
    const byLayer = new Map<string, CalendarShift>();
    overlapping.forEach(shift => {
      const layerName = shift.label.split(':')[0].trim();

      // If we haven't seen this layer yet, or if this shift starts on this day (preferred)
      if (!byLayer.has(layerName)) {
        byLayer.set(layerName, shift);
      } else {
        const existing = byLayer.get(layerName)!;
        const shiftStart = new Date(shift.start).getTime();
        const existingStart = new Date(existing.start).getTime();
        const dayStartTime = dayStart.getTime();
        const dayEndTime = dayEnd.getTime();

        // Prefer shift that starts on this day
        const shiftStartsToday = shiftStart >= dayStartTime && shiftStart < dayEndTime;
        const existingStartsToday = existingStart >= dayStartTime && existingStart < dayEndTime;

        if (shiftStartsToday && !existingStartsToday) {
          byLayer.set(layerName, shift);
        } else if (!shiftStartsToday && !existingStartsToday) {
          // If neither starts today, prefer the one with more overlap
          const shiftOverlap =
            Math.min(new Date(shift.end).getTime(), dayEndTime) -
            Math.max(new Date(shift.start).getTime(), dayStartTime);
          const existingOverlap =
            Math.min(new Date(existing.end).getTime(), dayEndTime) -
            Math.max(existingStart, dayStartTime);
          if (shiftOverlap > existingOverlap) {
            byLayer.set(layerName, shift);
          }
        }
      }
    });

    // Return only one shift per layer, sorted by layer name for consistency
    return Array.from(byLayer.values()).sort((a, b) => {
      const layerA = a.label.split(':')[0].trim();
      const layerB = b.label.split(':')[0].trim();
      return layerA.localeCompare(layerB);
    });
  };

  for (let i = 0; i < startOffset; i++) {
    const date = new Date(year, month, 1 - (startOffset - i));
    cells.push({ date, inMonth: false, shifts: shiftsForDate(date) });
  }

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day);
    cells.push({ date, inMonth: true, shifts: shiftsForDate(date) });
  }

  const trailing = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let i = 1; i <= trailing; i++) {
    const date = new Date(year, month, totalDays + i);
    cells.push({ date, inMonth: false, shifts: shiftsForDate(date) });
  }

  return cells;
}

export default function ScheduleCalendar({ shifts, timeZone }: ScheduleCalendarProps) {
  const [cursor, setCursor] = useState(() => new Date());
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [filterLayer, _setFilterLayer] = useState<string | null>(null);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone,
      }).format(cursor),
    [cursor, timeZone]
  );

  const filteredShifts = useMemo(() => {
    if (!filterLayer) return shifts;
    return shifts.filter(shift => shift.label.startsWith(filterLayer + ':'));
  }, [shifts, filterLayer]);

  const calendarCells = useMemo(
    () => buildCalendar(cursor, filteredShifts),
    [cursor, filteredShifts]
  );
  const todayKey = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toDateString();
  }, []);

  const toggleExpand = (dateKey: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  const handlePrev = () => {
    setCursor(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNext = () => {
    setCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCursor(new Date());
  };

  return (
    <section
      className="glass-panel"
      style={{
        padding: '1.5rem',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div>
          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              margin: 0,
              marginBottom: '0.25rem',
            }}
          >
            On-call Calendar
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            Shows all active layers. Multiple layers can be active simultaneously.
          </p>
        </div>
        <span
          style={{
            padding: '0.3rem 0.6rem',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: '600',
            background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
            color: '#0c4a6e',
            border: '1px solid #bae6fd',
          }}
        >
          {monthLabel}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.5rem',
          marginBottom: '1rem',
        }}
      >
        <button
          type="button"
          className="glass-button"
          onClick={handlePrev}
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
        >
          Prev
        </button>
        <button
          type="button"
          className="glass-button"
          onClick={handleToday}
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
        >
          Today
        </button>
        <button
          type="button"
          className="glass-button"
          onClick={handleNext}
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
        >
          Next
        </button>
      </div>
      <div className="calendar-weekdays">
        {weekdayLabels.map(day => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {calendarCells.map(cell => {
          const isToday = cell.date.toDateString() === todayKey;
          const dateKey = cell.date.toISOString();
          const isExpanded = expandedDates.has(dateKey);
          const preview = cell.shifts.slice(0, 2);
          const remaining = cell.shifts.length - preview.length;
          const showAll = isExpanded || cell.shifts.length <= 2;

          return (
            <div
              key={dateKey}
              className={`calendar-day ${cell.inMonth ? '' : 'inactive'} ${isToday ? 'today' : ''}`}
            >
              <span className="calendar-date">{cell.date.getDate()}</span>
              {cell.shifts.length > 0 && (
                <div className="calendar-shifts">
                  {(showAll ? cell.shifts : preview).map(shift => {
                    const start = new Date(shift.start);
                    const end = new Date(shift.end);
                    const startTime = formatDateTime(start, timeZone, { format: 'time' });
                    const endTime = formatDateTime(end, timeZone, { format: 'time' });
                    const isMultiDay = start.toDateString() !== end.toDateString();
                    return (
                      <div
                        key={shift.id}
                        className="calendar-shift"
                        title={`${startTime} - ${endTime}${isMultiDay ? ' (spans multiple days)' : ''}`}
                      >
                        {shift.user ? (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              width: '100%',
                            }}
                          >
                            <div
                              style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                flexShrink: 0,
                                border: '1px solid rgba(255,255,255,0.5)',
                              }}
                            >
                              <img
                                src={
                                  shift.user.avatarUrl ||
                                  getDefaultAvatar(shift.user.gender, shift.user.name)
                                } // using name as seed if id not avail
                                alt={shift.user.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>
                            <span className="calendar-shift-name" style={{ flex: 1, minWidth: 0 }}>
                              {shift.user.name}
                            </span>
                          </div>
                        ) : (
                          <span className="calendar-shift-name">{shift.label}</span>
                        )}
                        {isMultiDay && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              opacity: 0.7,
                              marginLeft: '0.25rem',
                            }}
                          >
                            (multi-day)
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {remaining > 0 && !isExpanded && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        toggleExpand(dateKey);
                      }}
                      className="calendar-shift-more"
                      style={{
                        cursor: 'pointer',
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: '4px',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        color: '#6366f1',
                        transition: 'all 0.2s',
                        width: '100%',
                        textAlign: 'center',
                        marginTop: '0.25rem',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                      }}
                    >
                      +{remaining} more
                    </button>
                  )}
                  {isExpanded && remaining > 0 && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        toggleExpand(dateKey);
                      }}
                      className="calendar-shift-more"
                      style={{
                        cursor: 'pointer',
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: '4px',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        color: '#6366f1',
                        transition: 'all 0.2s',
                        width: '100%',
                        textAlign: 'center',
                        marginTop: '0.25rem',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                      }}
                    >
                      Show less
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
