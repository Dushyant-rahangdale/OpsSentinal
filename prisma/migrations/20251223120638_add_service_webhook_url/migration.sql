/*
  Warnings:

  - Made the column `emailNotificationsEnabled` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `smsNotificationsEnabled` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `pushNotificationsEnabled` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable: Add webhookUrl to Service
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "webhookUrl" TEXT;

-- AlterTable: Add notification columns to User if they don't exist, then set constraints
DO $$
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'emailNotificationsEnabled') THEN
        ALTER TABLE "User" ADD COLUMN "emailNotificationsEnabled" BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'smsNotificationsEnabled') THEN
        ALTER TABLE "User" ADD COLUMN "smsNotificationsEnabled" BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'pushNotificationsEnabled') THEN
        ALTER TABLE "User" ADD COLUMN "pushNotificationsEnabled" BOOLEAN DEFAULT false;
    END IF;
    
    -- Update any NULL values to false
    UPDATE "User" SET "emailNotificationsEnabled" = false WHERE "emailNotificationsEnabled" IS NULL;
    UPDATE "User" SET "smsNotificationsEnabled" = false WHERE "smsNotificationsEnabled" IS NULL;
    UPDATE "User" SET "pushNotificationsEnabled" = false WHERE "pushNotificationsEnabled" IS NULL;
END $$;

-- Now set NOT NULL constraints
ALTER TABLE "User" ALTER COLUMN "emailNotificationsEnabled" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "emailNotificationsEnabled" SET DEFAULT false;
ALTER TABLE "User" ALTER COLUMN "smsNotificationsEnabled" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "pushNotificationsEnabled" SET NOT NULL;

-- CreateTable: Create NotificationProvider table if it doesn't exist
CREATE TABLE IF NOT EXISTS "NotificationProvider" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Create indexes if they don't exist (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationProvider_provider_key" ON "NotificationProvider"("provider");
CREATE INDEX IF NOT EXISTS "NotificationProvider_provider_idx" ON "NotificationProvider"("provider");

-- CreateIndex: Create indexes if they don't exist (idempotent)
CREATE INDEX IF NOT EXISTS "Alert_serviceId_status_idx" ON "Alert"("serviceId", "status");
CREATE INDEX IF NOT EXISTS "Alert_incidentId_idx" ON "Alert"("incidentId");
CREATE INDEX IF NOT EXISTS "Alert_dedupKey_status_idx" ON "Alert"("dedupKey", "status");
CREATE INDEX IF NOT EXISTS "Alert_createdAt_idx" ON "Alert"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "Incident_status_createdAt_idx" ON "Incident"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Incident_serviceId_status_idx" ON "Incident"("serviceId", "status");
CREATE INDEX IF NOT EXISTS "Incident_assigneeId_status_idx" ON "Incident"("assigneeId", "status");
CREATE INDEX IF NOT EXISTS "Incident_createdAt_idx" ON "Incident"("createdAt");
CREATE INDEX IF NOT EXISTS "Incident_urgency_status_idx" ON "Incident"("urgency", "status");
CREATE INDEX IF NOT EXISTS "IncidentEvent_incidentId_createdAt_idx" ON "IncidentEvent"("incidentId", "createdAt");
CREATE INDEX IF NOT EXISTS "IncidentNote_incidentId_createdAt_idx" ON "IncidentNote"("incidentId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_incidentId_idx" ON "Notification"("incidentId");
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_status_createdAt_idx" ON "Notification"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_channel_status_idx" ON "Notification"("channel", "status");

-- AddForeignKey: Add foreign key if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'NotificationProvider_updatedBy_fkey'
    ) THEN
        ALTER TABLE "NotificationProvider" 
        ADD CONSTRAINT "NotificationProvider_updatedBy_fkey" 
        FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
