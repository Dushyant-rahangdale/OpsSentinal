const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const indexes = [
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notification_tenant_fair_delivery"
   ON "Notification"("trafficClass", "tenantKey", "status", "nextAttemptAt", "createdAt")`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS "StatusPageSubscription_statusPageId_state_idx"
   ON "StatusPageSubscription"("statusPageId", "state")`,
];

async function main() {
  for (const statement of indexes) {
    await prisma.$executeRawUnsafe(statement);
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
