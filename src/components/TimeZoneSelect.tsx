'use client';

import { useEffect, useState, useMemo } from 'react';
import { getAllTimeZones } from '@/lib/timezone';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/shadcn/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/shadcn/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';

type TimeZoneSelectProps = {
  name: string;
  defaultValue?: string;
  id?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
};

export default function TimeZoneSelect({
  name,
  defaultValue = 'UTC',
  id,
  disabled,
  onChange,
}: TimeZoneSelectProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);

  // Group timezones by region (e.g., America, Europe)
  const groupedTimeZones = useMemo(() => {
    const zones = getAllTimeZones();
    const groups: Record<string, typeof zones> = {};

    zones.forEach(zone => {
      const parts = zone.value.split('/');
      const region = parts.length > 1 ? parts[0] : 'Others';
      if (!groups[region]) {
        groups[region] = [];
      }
      groups[region].push(zone);
    });

    // Sort regions alphabetically
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, []);

  // Sync value if props change
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const handleSelect = (currentValue: string) => {
    setValue(currentValue);
    setOpen(false);
    if (onChange) {
      onChange(currentValue);
    }
  };

  // Find the label for the display button.
  // We flatten the groups again or simpler, just look it up.
  // Optimization: Just default to value if not found, but we want the nice label.
  const selectedLabel = useMemo(() => {
    for (const [_, zones] of groupedTimeZones) {
      const found = zones.find(z => z.value === value);
      if (found) return found.label;
    }
    return value;
  }, [groupedTimeZones, value]);

  return (
    <div className="relative">
      {/* Hidden input for formData support */}
      <input type="hidden" name={name} value={value} id={id} />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            disabled={disabled}
          >
            {value ? selectedLabel : 'Select timezone...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search timezone..." />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>No timezone found.</CommandEmpty>
              {groupedTimeZones.map(([region, zones]) => (
                <CommandGroup key={region} heading={region}>
                  {zones.map(zone => (
                    <CommandItem
                      key={zone.value}
                      value={zone.label} // Search by label (includes UTC offset) and value
                      onSelect={() => handleSelect(zone.value)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === zone.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {zone.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
