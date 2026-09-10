CREATE TABLE "StatusPageRouteOperation" (
  "id" TEXT NOT NULL,
  "statusPageId" TEXT NOT NULL,
  "routeKey" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "StatusPageRouteOperation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StatusPageRouteOperation_operation_check" CHECK ("operation" IN ('ADD', 'REMOVE')),
  CONSTRAINT "StatusPageRouteOperation_state_check" CHECK ("state" IN ('PENDING', 'COMPLETE', 'FAILED')),
  CONSTRAINT "StatusPageRouteOperation_statusPageId_fkey" FOREIGN KEY ("statusPageId") REFERENCES "StatusPage"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StatusPageRouteOperation_statusPageId_routeKey_operation_key"
  ON "StatusPageRouteOperation"("statusPageId", "routeKey", "operation");
CREATE INDEX "StatusPageRouteOperation_state_nextAttemptAt_idx"
  ON "StatusPageRouteOperation"("state", "nextAttemptAt");
