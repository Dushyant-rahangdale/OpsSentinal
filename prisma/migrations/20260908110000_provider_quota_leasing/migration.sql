CREATE TABLE "ProviderQuotaWindow" (
  "id" TEXT NOT NULL,
  "providerKey" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "globalUsed" INTEGER NOT NULL DEFAULT 0,
  "bulkUsed" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProviderQuotaWindow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderWorkerLease" (
  "id" TEXT NOT NULL,
  "workerId" TEXT NOT NULL,
  "providerKey" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "reservedSlots" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "heartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProviderWorkerLease_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderQuotaWindow_providerKey_channel_windowStart_key"
  ON "ProviderQuotaWindow"("providerKey", "channel", "windowStart");
CREATE INDEX "ProviderQuotaWindow_expiresAt_idx" ON "ProviderQuotaWindow"("expiresAt");
CREATE UNIQUE INDEX "ProviderWorkerLease_workerId_providerKey_channel_key"
  ON "ProviderWorkerLease"("workerId", "providerKey", "channel");
CREATE INDEX "ProviderWorkerLease_providerKey_channel_expiresAt_idx"
  ON "ProviderWorkerLease"("providerKey", "channel", "expiresAt");
CREATE INDEX "ProviderWorkerLease_expiresAt_idx" ON "ProviderWorkerLease"("expiresAt");
