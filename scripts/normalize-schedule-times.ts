import { PrismaClient } from '@prisma/client';

function isValidTimeZone(timeZone: string): boolean {
    try {
        Intl.DateTimeFormat(undefined, { timeZone });
        return true;
    } catch {
        return false;
    }
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        const parts = formatter.formatToParts(date);
        const partMap: Record<string, string> = {};
        for (const part of parts) {
            if (part.type !== 'literal') {
                partMap[part.type] = part.value;
            }
        }
        const asUtc = Date.UTC(
            Number(partMap.year),
            Number(partMap.month) - 1,
            Number(partMap.day),
            Number(partMap.hour),
            Number(partMap.minute),
            Number(partMap.second)
        );
        return asUtc - date.getTime();
    } catch {
        return 0;
    }
}

function parseDateTimeInTimeZone(value: string, timeZone: string): Date | null {
    if (!value) {
        return null;
    }

    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!match) {
        return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);

    if ([year, month, day, hour, minute].some(Number.isNaN)) {
        return null;
    }

    const utcMillis = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
    const offsetMs = getTimeZoneOffsetMs(new Date(utcMillis), timeZone);
    return new Date(utcMillis - offsetMs);
}

function formatDateForInput(date: Date, timeZone: string): string {
    if (!date || isNaN(date.getTime())) {
        return '';
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const day = parts.find(p => p.type === 'day')?.value || '';
    const hour = parts.find(p => p.type === 'hour')?.value || '';
    const minute = parts.find(p => p.type === 'minute')?.value || '';

    return `${year}-${month}-${day}T${hour}:${minute}`;
}

const prisma = new PrismaClient();

type Args = {
    sourceTimeZone: string;
    scheduleId?: string;
    dryRun: boolean;
};

function parseArgs(argv: string[]): Args {
    const getValue = (flag: string) => {
        const idx = argv.indexOf(flag);
        return idx >= 0 ? argv[idx + 1] : undefined;
    };

    return {
        sourceTimeZone: getValue('--source-tz') || 'UTC',
        scheduleId: getValue('--schedule-id'),
        dryRun: argv.includes('--dry-run')
    };
}

function normalizeDate(date: Date, sourceTimeZone: string, targetTimeZone: string): Date | null {
    const localValue = formatDateForInput(date, sourceTimeZone);
    return parseDateTimeInTimeZone(localValue, targetTimeZone);
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    if (!isValidTimeZone(args.sourceTimeZone)) {
        throw new Error(`Invalid source timezone: ${args.sourceTimeZone}`);
    }

    const schedules = await prisma.onCallSchedule.findMany({
        where: args.scheduleId ? { id: args.scheduleId } : undefined,
        include: { layers: true, overrides: true }
    });

    if (schedules.length === 0) {
        console.log('No schedules found.');
        return;
    }

    let layerUpdates = 0;
    let overrideUpdates = 0;

    for (const schedule of schedules) {
        const targetTimeZone = schedule.timeZone || 'UTC';
        if (!isValidTimeZone(targetTimeZone)) {
            console.warn(`Skipping schedule ${schedule.id} due to invalid timezone: ${targetTimeZone}`);
            continue;
        }

        for (const layer of schedule.layers) {
            const nextStart = normalizeDate(layer.start, args.sourceTimeZone, targetTimeZone);
            const nextEnd = layer.end ? normalizeDate(layer.end, args.sourceTimeZone, targetTimeZone) : null;

            if (!nextStart || (layer.end && !nextEnd)) {
                console.warn(`Skipping layer ${layer.id} due to invalid parsed date`);
                continue;
            }

            const startChanged = layer.start.getTime() !== nextStart.getTime();
            const endChanged = (layer.end?.getTime() || null) !== (nextEnd?.getTime() || null);

            if (startChanged || endChanged) {
                layerUpdates += 1;
                if (!args.dryRun) {
                    await prisma.onCallLayer.update({
                        where: { id: layer.id },
                        data: {
                            start: nextStart,
                            end: nextEnd
                        }
                    });
                }
            }
        }

        for (const override of schedule.overrides) {
            const nextStart = normalizeDate(override.start, args.sourceTimeZone, targetTimeZone);
            const nextEnd = normalizeDate(override.end, args.sourceTimeZone, targetTimeZone);

            if (!nextStart || !nextEnd) {
                console.warn(`Skipping override ${override.id} due to invalid parsed date`);
                continue;
            }

            const startChanged = override.start.getTime() !== nextStart.getTime();
            const endChanged = override.end.getTime() !== nextEnd.getTime();

            if (startChanged || endChanged) {
                overrideUpdates += 1;
                if (!args.dryRun) {
                    await prisma.onCallOverride.update({
                        where: { id: override.id },
                        data: {
                            start: nextStart,
                            end: nextEnd
                        }
                    });
                }
            }
        }
    }

    const modeLabel = args.dryRun ? 'Dry run' : 'Applied';
    console.log(`${modeLabel}: ${layerUpdates} layer updates, ${overrideUpdates} override updates.`);
}

main()
    .catch((error) => {
        console.error('Normalization failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
