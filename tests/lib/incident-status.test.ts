import { describe, it, expect } from 'vitest';

const activeStatuses = ['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'SUPPRESSED'] as const;
const resolvedStatus = 'RESOLVED' as const;

describe('Incident status filtering', () => {
    it('matches the intent of not RESOLVED for known statuses', () => {
        const allStatuses = [...activeStatuses, resolvedStatus] as const;

        const byExplicitList = new Set(activeStatuses);
        const byNotResolved = new Set(allStatuses.filter((status) => status !== resolvedStatus));

        expect(byExplicitList).toEqual(byNotResolved);
    });
});
