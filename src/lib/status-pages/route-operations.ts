import 'server-only';
import prisma from '@/lib/prisma';
import { getStatusPageServingStore } from './serving-store';

const MAX_ERROR_LENGTH = 500;

/** Finish route changes independently from the settings request that created them. */
export async function reconcileStatusPageRouteOperations(limit = 50, statusPageId?: string) {
  const operations = await prisma.statusPageRouteOperation.findMany({
    where: {
      ...(statusPageId ? { statusPageId } : {}),
      state: { in: ['PENDING', 'FAILED'] },
      nextAttemptAt: { lte: new Date() },
    },
    orderBy: { createdAt: 'asc' },
    take: Math.max(1, Math.min(limit, 100)),
  });
  const store = getStatusPageServingStore();
  let completed = 0;
  for (const operation of operations) {
    try {
      if (operation.operation === 'ADD') {
        const route = await store.resolveRoute(operation.routeKey);
        if (route?.pageId !== operation.statusPageId) {
          throw new Error(`Route ${operation.routeKey} does not resolve to its status page`);
        }
      } else {
        await store.removeRoute(operation.routeKey, operation.statusPageId);
      }
      await prisma.statusPageRouteOperation.update({
        where: { id: operation.id },
        data: { state: 'COMPLETE', attempts: { increment: 1 }, completedAt: new Date(), lastError: null },
      });
      completed++;
    } catch (error) {
      const attempts = operation.attempts + 1;
      await prisma.statusPageRouteOperation.update({
        where: { id: operation.id },
        data: {
          state: 'FAILED',
          attempts,
          lastError: (error instanceof Error ? error.message : String(error)).slice(0, MAX_ERROR_LENGTH),
          nextAttemptAt: new Date(Date.now() + Math.min(300_000, 1_000 * 2 ** Math.min(attempts, 8))),
        },
      });
    }
  }
  return { attempted: operations.length, completed };
}
