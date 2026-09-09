CREATE TYPE "StatusPageSubscriptionState" AS ENUM ('PENDING', 'ACTIVE', 'UNSUBSCRIBED', 'SUPPRESSED', 'BOUNCED', 'COMPLAINED');

ALTER TABLE "Notification" ADD COLUMN "tenantKey" TEXT NOT NULL DEFAULT 'system';
-- These indexes cover existing, write-heavy tables. Prisma applies PostgreSQL
-- migrations without an implicit transaction, which permits online creation.
CREATE INDEX CONCURRENTLY "idx_notification_tenant_fair_delivery" ON "Notification"("trafficClass", "tenantKey", "status", "nextAttemptAt", "createdAt");

ALTER TABLE "StatusPageSubscription"
  ADD COLUMN "state" "StatusPageSubscriptionState" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "suppressionReason" TEXT,
  ADD COLUMN "lastBounceAt" TIMESTAMP(3),
  ADD COLUMN "bounceCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "complainedAt" TIMESTAMP(3),
  ADD COLUMN "lastDeliveredAt" TIMESTAMP(3),
  ADD COLUMN "lastFailedAt" TIMESTAMP(3);

UPDATE "StatusPageSubscription"
SET "state" = CASE
  WHEN "unsubscribedAt" IS NOT NULL THEN 'UNSUBSCRIBED'::"StatusPageSubscriptionState"
  WHEN "verified" = TRUE THEN 'ACTIVE'::"StatusPageSubscriptionState"
  ELSE 'PENDING'::"StatusPageSubscriptionState"
END;

CREATE INDEX CONCURRENTLY "StatusPageSubscription_statusPageId_state_idx" ON "StatusPageSubscription"("statusPageId", "state");

CREATE TABLE "NotificationProviderFeedback" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "eventType" TEXT NOT NULL,
  "recipientHash" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationProviderFeedback_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationProviderFeedback_provider_providerEventId_key" ON "NotificationProviderFeedback"("provider", "providerEventId");
CREATE INDEX "NotificationProviderFeedback_providerMessageId_idx" ON "NotificationProviderFeedback"("providerMessageId");
CREATE INDEX "NotificationProviderFeedback_eventType_occurredAt_idx" ON "NotificationProviderFeedback"("eventType", "occurredAt");
