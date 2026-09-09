-- Additive schema; deploy before the new producers and consumers.
CREATE TYPE "NotificationTrafficClass" AS ENUM ('CRITICAL', 'TRANSACTIONAL', 'PUBLIC_INCIDENT', 'BULK');
ALTER TABLE "Notification" ADD COLUMN "trafficClass" "NotificationTrafficClass" NOT NULL DEFAULT 'TRANSACTIONAL';

-- Only durable, active rows enter the central queue. Leave historical delivery data alone.
UPDATE "Notification"
SET "trafficClass" = CASE
  WHEN "category" = 'STATUS_PAGE' AND "templateKey" IN ('status-page-incident-triggered', 'status-page-incident-investigating', 'status-page-incident-identified', 'status-page-incident-monitoring', 'status-page-incident-acknowledged', 'status-page-incident-check', 'status-page-incident-snoozed', 'status-page-incident-suppressed') THEN 'PUBLIC_INCIDENT'::"NotificationTrafficClass"
  WHEN "category" = 'STATUS_PAGE' THEN 'BULK'::"NotificationTrafficClass"
  WHEN "category" = 'INCIDENT' AND "templateKey" LIKE '%triggered' THEN 'CRITICAL'::"NotificationTrafficClass"
  ELSE 'TRANSACTIONAL'::"NotificationTrafficClass"
END,
"priority" = CASE
  WHEN "category" = 'STATUS_PAGE' AND "templateKey" = 'status-page-incident-triggered' THEN 4
  WHEN "category" = 'STATUS_PAGE' AND "templateKey" IN ('status-page-incident-resolved', 'status-page-incident-completed') THEN 6
  WHEN "category" = 'STATUS_PAGE' AND "templateKey" IN ('status-page-incident-scheduled', 'status-page-incident-inprogress', 'status-page-announcement') THEN 8
  WHEN "category" = 'STATUS_PAGE' THEN 5
  WHEN "category" = 'INCIDENT' AND "templateKey" LIKE '%triggered' THEN 0
  WHEN "category" = 'INCIDENT' THEN 2
  ELSE "priority"
END
WHERE "payloadEncrypted" IS NOT NULL AND "status" IN ('PENDING', 'FAILED');
