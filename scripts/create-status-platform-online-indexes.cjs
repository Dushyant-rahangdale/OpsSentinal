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

const requiredIndexNames = [
  'idx_notification_tenant_fair_delivery',
  'StatusPageSubscription_statusPageId_state_idx',
];

async function assertRequiredIndexes() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT c.relname AS name, i.indisvalid AS valid
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    WHERE c.relname = ANY(ARRAY[${requiredIndexNames
      .map(name => `'${name}'`)
      .join(',')}])
  `);
  const valid = new Set(rows.filter(row => row.valid).map(row => row.name));
  const missing = requiredIndexNames.filter(name => !valid.has(name));
  if (missing.length > 0) {
    throw new Error(
      `Status platform online indexes are missing or invalid: ${missing.join(', ')}. ` +
        'Run npm run prisma:indexes:status-platform before starting notification workers.'
    );
  }
}

async function main() {
  let lockAcquired = false;

  try {
    // Cast PostgreSQL's void result so Prisma can deserialize the row.
    await prisma.$queryRawUnsafe(
      `SELECT pg_advisory_lock(${INSTALL_LOCK_ID})::text AS "lockResult"`
    );
    lockAcquired = true;

    for (const statement of indexes) {
      await prisma.$executeRawUnsafe(statement);
    }
    await assertRequiredIndexes();
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
