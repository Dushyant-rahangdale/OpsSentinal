const { PrismaClient } = require('@prisma/client');

const databaseUrl = new URL(process.env.DATABASE_URL);
// Session-level advisory locks require every statement to use the same backend.
// A dedicated one-connection Prisma pool provides that guarantee during startup.
databaseUrl.searchParams.set('connection_limit', '1');

const prisma = new PrismaClient({
  datasourceUrl: databaseUrl.toString(),
});

const INSTALL_LOCK_ID = 1448233807;

const indexes = [
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notification_tenant_fair_delivery"
   ON "Notification"("trafficClass", "tenantKey", "status", "nextAttemptAt", "createdAt")`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS "StatusPageSubscription_statusPageId_state_idx"
   ON "StatusPageSubscription"("statusPageId", "state")`,
];

async function main() {
  let lockAcquired = false;

  try {
    await prisma.$queryRawUnsafe(`SELECT pg_advisory_lock(${INSTALL_LOCK_ID})`);
    lockAcquired = true;

    for (const statement of indexes) {
      await prisma.$executeRawUnsafe(statement);
    }
  } finally {
    if (lockAcquired) {
      await prisma.$queryRawUnsafe(`SELECT pg_advisory_unlock(${INSTALL_LOCK_ID})`);
    }
  }
}

main()
  .catch(error => {
    console.error('Status platform online index installation failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
