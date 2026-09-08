CREATE TABLE "NotificationContent" (
  "id" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "encryptedTemplate" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationContent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationFanout" (
  "id" TEXT NOT NULL,
  "statusPageId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "trafficClass" "NotificationTrafficClass" NOT NULL,
  "providerKey" TEXT,
  "contentId" TEXT NOT NULL,
  "cursor" TEXT,
  "totalTargets" INTEGER,
  "materializedTargets" INTEGER NOT NULL DEFAULT 0,
  "completedTargets" INTEGER NOT NULL DEFAULT 0,
  "failedTargets" INTEGER NOT NULL DEFAULT 0,
  "skippedTargets" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationFanout_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Notification" ADD COLUMN "contentId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "fanoutId" TEXT;

CREATE UNIQUE INDEX "NotificationContent_contentHash_key" ON "NotificationContent"("contentHash");
CREATE UNIQUE INDEX "NotificationFanout_statusPageId_sourceType_sourceId_eventKey_key"
  ON "NotificationFanout"("statusPageId", "sourceType", "sourceId", "eventKey");
CREATE INDEX "NotificationFanout_status_createdAt_idx" ON "NotificationFanout"("status", "createdAt");
CREATE INDEX "NotificationFanout_statusPageId_createdAt_idx" ON "NotificationFanout"("statusPageId", "createdAt");
CREATE INDEX "Notification_fanoutId_status_idx" ON "Notification"("fanoutId", "status");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_contentId_fkey"
  FOREIGN KEY ("contentId") REFERENCES "NotificationContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_fanoutId_fkey"
  FOREIGN KEY ("fanoutId") REFERENCES "NotificationFanout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationFanout" ADD CONSTRAINT "NotificationFanout_contentId_fkey"
  FOREIGN KEY ("contentId") REFERENCES "NotificationContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
