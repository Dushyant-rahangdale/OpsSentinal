-- Add incident snooze/suppress notification toggles
ALTER TABLE "SystemSettings"
ADD COLUMN IF NOT EXISTS "notifyOnSnoozed" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "SystemSettings"
ADD COLUMN IF NOT EXISTS "notifyOnSuppressed" BOOLEAN NOT NULL DEFAULT true;
