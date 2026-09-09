import { createHash, randomBytes } from 'node:crypto';
import prisma from '@/lib/prisma';

export function hashSubscriptionToken(token: string) {
  return `sha256:${createHash('sha256').update(token).digest('hex')}`;
}

/** A separate hash per delivered link keeps older notification links usable. */
export async function issueUnsubscribeToken(subscriptionId: string) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashSubscriptionToken(token);
  await prisma.$executeRaw`
    INSERT INTO "StatusPageSubscriptionToken" ("tokenHash", "subscriptionId")
    VALUES (${tokenHash}, ${subscriptionId})
  `;
  return token;
}

export async function issueUnsubscribeTokensBatch(subscriptionIds: readonly string[]) {
  const issued = subscriptionIds.map(subscriptionId => {
    const token = randomBytes(32).toString('hex');
    return { subscriptionId, token, tokenHash: hashSubscriptionToken(token) };
  });
  if (issued.length > 0) {
    await prisma.statusPageSubscriptionToken.createMany({
      data: issued.map(({ subscriptionId, tokenHash }) => ({ subscriptionId, tokenHash })),
      skipDuplicates: true,
    });
  }
  return new Map(issued.map(({ subscriptionId, token }) => [subscriptionId, token]));
}

export async function findUnsubscribeSubscription(token: string) {
  if (!token || token.length > 256) return null;
  const hash = hashSubscriptionToken(token);
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "StatusPageSubscription" WHERE "token" = ${hash}
    UNION ALL
    SELECT "subscriptionId" AS "id" FROM "StatusPageSubscriptionToken" WHERE "tokenHash" = ${hash}
    LIMIT 1
  `;
  return rows[0]
    ? prisma.statusPageSubscription.findUnique({
        where: { id: rows[0].id },
        include: { statusPage: true },
      })
    : null;
}
