-- Add incident notification event toggles
ALTER TABLE "SystemSettings"
ADD COLUMN IF NOT EXISTS "notifyOnTriggered" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "SystemSettings"
ADD COLUMN IF NOT EXISTS "notifyOnAcknowledged" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "SystemSettings"
ADD COLUMN IF NOT EXISTS "notifyOnResolved" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "SystemSettings"
ADD COLUMN IF NOT EXISTS "notifyOnUpdated" BOOLEAN NOT NULL DEFAULT true;
