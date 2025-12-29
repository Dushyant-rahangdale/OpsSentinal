-- Idempotent Sync Migration
-- This migration fixes schema drift by safely applying changes even if they partially exist.

-- 1. OidcConfig FK Drop
ALTER TABLE "OidcConfig" DROP CONSTRAINT IF EXISTS "OidcConfig_updatedBy_fkey";

-- 2. Drop Index
DROP INDEX IF EXISTS "InAppNotification_userId_createdAt_readAt_idx";

-- 3. EscalationRule notificationChannels
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'EscalationRule' AND column_name = 'notificationChannels') THEN
        ALTER TABLE "EscalationRule" ADD COLUMN "notificationChannels" "NotificationChannel"[];
    END IF;
END $$;

-- 4. OidcConfig Updates
ALTER TABLE "OidcConfig" ALTER COLUMN "id" SET DEFAULT 'default';
ALTER TABLE "OidcConfig" ALTER COLUMN "enabled" SET DEFAULT true;
ALTER TABLE "OidcConfig" ALTER COLUMN "issuer" SET NOT NULL;
ALTER TABLE "OidcConfig" ALTER COLUMN "clientId" SET NOT NULL;
ALTER TABLE "OidcConfig" ALTER COLUMN "clientSecret" SET NOT NULL;
ALTER TABLE "OidcConfig" ALTER COLUMN "autoProvision" SET DEFAULT true;
ALTER TABLE "OidcConfig" ALTER COLUMN "updatedBy" SET NOT NULL;

-- 5. Postmortem
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Postmortem' AND column_name = 'isPublic') THEN
       ALTER TABLE "Postmortem" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true;
   END IF;
END $$;

-- 6. Service
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Service' AND column_name = 'region') THEN
       ALTER TABLE "Service" ADD COLUMN "region" TEXT;
   END IF;
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Service' AND column_name = 'slaTier') THEN
       ALTER TABLE "Service" ADD COLUMN "slaTier" TEXT;
   END IF;
END $$;

-- 7. StatusPage - Add all potentially missing columns
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'StatusPage' AND column_name = 'enableUptimeExports') THEN
       ALTER TABLE "StatusPage" ADD COLUMN "enableUptimeExports" BOOLEAN NOT NULL DEFAULT false;
   END IF;
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'StatusPage' AND column_name = 'showChangelog') THEN
       ALTER TABLE "StatusPage" ADD COLUMN "showChangelog" BOOLEAN NOT NULL DEFAULT true;
   END IF;
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'StatusPage' AND column_name = 'showPostIncidentReview') THEN
        ALTER TABLE "StatusPage" ADD COLUMN "showPostIncidentReview" BOOLEAN NOT NULL DEFAULT true;
   END IF;
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'StatusPage' AND column_name = 'showRegionHeatmap') THEN
        ALTER TABLE "StatusPage" ADD COLUMN "showRegionHeatmap" BOOLEAN NOT NULL DEFAULT true;
   END IF;
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'StatusPage' AND column_name = 'showServiceOwners') THEN
        ALTER TABLE "StatusPage" ADD COLUMN "showServiceOwners" BOOLEAN NOT NULL DEFAULT false;
   END IF;
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'StatusPage' AND column_name = 'showServiceSlaTier') THEN
        ALTER TABLE "StatusPage" ADD COLUMN "showServiceSlaTier" BOOLEAN NOT NULL DEFAULT false;
   END IF;
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'StatusPage' AND column_name = 'showSubscribe') THEN
        ALTER TABLE "StatusPage" ADD COLUMN "showSubscribe" BOOLEAN NOT NULL DEFAULT true;
   END IF;
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'StatusPage' AND column_name = 'statusApiRateLimitEnabled') THEN
        ALTER TABLE "StatusPage" ADD COLUMN "statusApiRateLimitEnabled" BOOLEAN NOT NULL DEFAULT false;
   END IF;
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'StatusPage' AND column_name = 'statusApiRateLimitMax') THEN
        ALTER TABLE "StatusPage" ADD COLUMN "statusApiRateLimitMax" INTEGER NOT NULL DEFAULT 120;
   END IF;
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'StatusPage' AND column_name = 'statusApiRateLimitWindowSec') THEN
        ALTER TABLE "StatusPage" ADD COLUMN "statusApiRateLimitWindowSec" INTEGER NOT NULL DEFAULT 60;
   END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'StatusPage' AND column_name = 'statusApiRequireToken') THEN
        ALTER TABLE "StatusPage" ADD COLUMN "statusApiRequireToken" BOOLEAN NOT NULL DEFAULT false;
   END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'StatusPage' AND column_name = 'showServiceRegions') THEN
        ALTER TABLE "StatusPage" ADD COLUMN "showServiceRegions" BOOLEAN NOT NULL DEFAULT true;
   END IF;
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'StatusPage' AND column_name = 'showServicesByRegion') THEN
        ALTER TABLE "StatusPage" ADD COLUMN "showServicesByRegion" BOOLEAN NOT NULL DEFAULT false;
   END IF;
END $$;

-- Reset StatusPage enabled default
ALTER TABLE "StatusPage" ALTER COLUMN "enabled" SET DEFAULT false;

-- 8. StatusPageAnnouncement
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'StatusPageAnnouncement' AND column_name = 'affectedServiceIds') THEN
       ALTER TABLE "StatusPageAnnouncement" ADD COLUMN "affectedServiceIds" JSONB;
   END IF;
END $$;

-- 9. SystemSettings Drops
ALTER TABLE "SystemSettings" DROP COLUMN IF EXISTS "notifyOnAcknowledged";
ALTER TABLE "SystemSettings" DROP COLUMN IF EXISTS "notifyOnResolved";
ALTER TABLE "SystemSettings" DROP COLUMN IF EXISTS "notifyOnSnoozed";
ALTER TABLE "SystemSettings" DROP COLUMN IF EXISTS "notifyOnSuppressed";
ALTER TABLE "SystemSettings" DROP COLUMN IF EXISTS "notifyOnTriggered";
ALTER TABLE "SystemSettings" DROP COLUMN IF EXISTS "notifyOnUnacknowledge";
ALTER TABLE "SystemSettings" DROP COLUMN IF EXISTS "notifyOnUnsnooze";
ALTER TABLE "SystemSettings" DROP COLUMN IF EXISTS "notifyOnUnsuppress";
ALTER TABLE "SystemSettings" DROP COLUMN IF EXISTS "notifyOnUpdated";

DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SystemSettings' AND column_name = 'encryptionKey') THEN
       ALTER TABLE "SystemSettings" ADD COLUMN "encryptionKey" TEXT;
   END IF;
END $$;

-- 10. Create Tables
CREATE TABLE IF NOT EXISTS "StatusPageApiToken" (
    "id" TEXT NOT NULL,
    "statusPageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "StatusPageApiToken_pkey" PRIMARY KEY ("id")
);

-- 11. Create Indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "StatusPageApiToken_statusPageId_revokedAt_idx" ON "StatusPageApiToken"("statusPageId", "revokedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "StatusPageApiToken_tokenHash_key" ON "StatusPageApiToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "InAppNotification_userId_readAt_createdAt_idx" ON "InAppNotification"("userId", "readAt", "createdAt");
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'OidcConfig_id_key'
        AND n.nspname = 'public'
    ) THEN
        CREATE UNIQUE INDEX "OidcConfig_id_key" ON "OidcConfig"("id");
    END IF;
END $$;

-- 12. Add Foreign Keys
ALTER TABLE "OidcConfig" DROP CONSTRAINT IF EXISTS "OidcConfig_updatedBy_fkey";
ALTER TABLE "OidcConfig" ADD CONSTRAINT "OidcConfig_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StatusPageApiToken" DROP CONSTRAINT IF EXISTS "StatusPageApiToken_statusPageId_fkey";
ALTER TABLE "StatusPageApiToken" ADD CONSTRAINT "StatusPageApiToken_statusPageId_fkey" FOREIGN KEY ("statusPageId") REFERENCES "StatusPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
