ALTER TABLE "Notification" ADD COLUMN "claimToken" TEXT;
ALTER TABLE "Notification" ADD COLUMN "claimedBy" TEXT;

CREATE INDEX "idx_notification_traffic_delivery_due"
  ON "Notification"("trafficClass", "status", "nextAttemptAt", "priority", "createdAt");

CREATE INDEX "idx_status_sub_active_cursor"
  ON "StatusPageSubscription"("statusPageId", "id")
  WHERE "verified" = true AND "unsubscribedAt" IS NULL;
