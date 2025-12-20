'use client';

import { useEffect, useState } from 'react';

const fallbackZones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Berlin',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney'
];

type TimeZoneSelectProps = {
    name: string;
    defaultValue?: string;
    id?: string;
    disabled?: boolean;
};

export default function TimeZoneSelect({ name, defaultValue = 'UTC', id, disabled }: TimeZoneSelectProps) {
    const [zones, setZones] = useState<string[]>(fallbackZones);

    useEffect(() => {
        if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
            const allZones = Intl.supportedValuesOf('timeZone');
            if (allZones.length > 0) {
                setZones(allZones);
            }
        }
    }, []);

    return (
        <select name={name} defaultValue={defaultValue} id={id} disabled={disabled}>
            {zones.map((zone) => (
                <option key={zone} value={zone}>
                    {zone}
                </option>
            ))}
        </select>
    );
}
