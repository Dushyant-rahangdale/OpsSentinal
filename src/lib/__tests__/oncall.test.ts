import { describe, expect, it } from 'vitest';
import { buildScheduleBlocks } from '../oncall';

const baseDate = new Date('2025-12-01T00:00:00Z');

function hoursFromBase(hours: number) {
    const date = new Date(baseDate);
    date.setHours(date.getHours() + hours);
    return date;
}

const layer = {
    id: 'layer-1',
    name: 'Primary Team',
    start: baseDate,
    end: null,
    rotationLengthHours: 24,
    users: [
        { userId: 'user-a', user: { name: 'Alice' }, position: 0 },
        { userId: 'user-b', user: { name: 'Bob' }, position: 1 }
    ]
};

describe('buildScheduleBlocks', () => {
    it('rotates users daily', () => {
        const blocks = buildScheduleBlocks(
            [layer],
            [],
            hoursFromBase(24),
            hoursFromBase(72)
        );

        expect(blocks.length).toBeGreaterThan(1);
        expect(blocks[0].userId).toBe('user-b');
        expect(blocks[0].end.getTime()).toBe(hoursFromBase(48).getTime());
        expect(blocks[blocks.length - 1].userId).toBe('user-a');
    });

    it('applies overrides and respects replace rules', () => {
        const overrides = [
            {
                id: 'override-1',
                userId: 'user-c',
                user: { name: 'Charlie' },
                start: hoursFromBase(30),
                end: hoursFromBase(42),
                replacesUserId: null
            }
        ];

        const blocks = buildScheduleBlocks(
            [layer],
            overrides,
            hoursFromBase(24),
            hoursFromBase(72)
        );

        const overrideBlock = blocks.find((block) => block.id.includes('override-1'));
        expect(overrideBlock).toBeDefined();
        expect(overrideBlock?.userId).toBe('user-c');
        expect(overrideBlock?.start.getTime()).toBe(hoursFromBase(30).getTime());
        expect(overrideBlock?.end.getTime()).toBe(hoursFromBase(42).getTime());
    });
});
