-- Add incident notification behavior toggles
ALTER TABLE "SystemSettings"
ADD COLUMN IF NOT EXISTS "notifyOnUnsnooze" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "SystemSettings"
ADD COLUMN IF NOT EXISTS "notifyOnUnsuppress" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "SystemSettings"
ADD COLUMN IF NOT EXISTS "notifyOnUnacknowledge" BOOLEAN NOT NULL DEFAULT true;
