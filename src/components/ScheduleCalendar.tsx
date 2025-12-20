'use client';

import { useMemo, useState } from 'react';

type CalendarShift = {
    id: string;
    start: string;
    end: string;
    label: string;
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
        return shifts
            .filter((shift) => {
                const start = new Date(shift.start);
                const end = new Date(shift.end);
                return start < dayEnd && end > dayStart;
            })
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
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
    const monthLabel = useMemo(
        () =>
            new Intl.DateTimeFormat('en-US', {
                month: 'long',
                year: 'numeric',
                timeZone
            }).format(cursor),
        [cursor, timeZone]
    );

    const calendarCells = useMemo(() => buildCalendar(cursor, shifts), [cursor, shifts]);
    const todayKey = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toDateString();
    }, []);

    const handlePrev = () => {
        setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNext = () => {
        setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const handleToday = () => {
        setCursor(new Date());
    };

    return (
        <section className="schedule-panel">
            <div className="schedule-panel-header calendar-header">
                <div>
                    <h3>On-call calendar</h3>
                    <span className="schedule-chip">{monthLabel}</span>
                </div>
                <div className="calendar-nav">
                    <button type="button" className="calendar-nav-button" onClick={handlePrev}>
                        Prev
                    </button>
                    <button type="button" className="calendar-nav-button" onClick={handleToday}>
                        Today
                    </button>
                    <button type="button" className="calendar-nav-button" onClick={handleNext}>
                        Next
                    </button>
                </div>
            </div>
            <div className="calendar-weekdays">
                {weekdayLabels.map((day) => (
                    <span key={day}>{day}</span>
                ))}
            </div>
            <div className="calendar-grid">
                {calendarCells.map((cell) => {
                    const isToday = cell.date.toDateString() === todayKey;
                    const preview = cell.shifts.slice(0, 2);
                    const remaining = cell.shifts.length - preview.length;
                    return (
                        <div
                            key={cell.date.toISOString()}
                            className={`calendar-day ${cell.inMonth ? '' : 'inactive'} ${isToday ? 'today' : ''}`}
                        >
                            <span className="calendar-date">{cell.date.getDate()}</span>
                            {preview.length > 0 && (
                                <div className="calendar-shifts">
                                    {preview.map((shift) => (
                                        <div key={shift.id} className="calendar-shift">
                                            <span className="calendar-shift-name">{shift.label}</span>
                                        </div>
                                    ))}
                                    {remaining > 0 && (
                                        <div className="calendar-shift-more">+{remaining} more</div>
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
