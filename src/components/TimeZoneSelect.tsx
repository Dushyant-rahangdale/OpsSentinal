'use client';

import { useEffect, useState } from 'react';
import { getAllTimeZones } from '@/lib/timezone';

type TimeZoneSelectProps = {
    name: string;
    defaultValue?: string;
    id?: string;
    disabled?: boolean;
    onChange?: (value: string) => void;
};

export default function TimeZoneSelect({ name, defaultValue = 'UTC', id, disabled, onChange }: TimeZoneSelectProps) {
    const [zones, setZones] = useState<Array<{ value: string; label: string }>>([]);
    const [selectedValue, setSelectedValue] = useState(defaultValue);

    useEffect(() => {
        // Load timezones with labels
        const timezones = getAllTimeZones();
        setZones(timezones);
    }, []);

    // Update selected value when defaultValue prop changes (e.g., after save)
    useEffect(() => {
        setSelectedValue(defaultValue);
    }, [defaultValue]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newValue = e.target.value;
        setSelectedValue(newValue);
        if (onChange) {
            onChange(newValue);
        }
    };

    return (
        <select
            name={name}
            value={selectedValue}
            onChange={handleChange}
            id={id}
            disabled={disabled}
        >
            {zones.map((zone) => (
                <option key={zone.value} value={zone.value}>
                    {zone.label}
                </option>
            ))}
        </select>
    );
}
