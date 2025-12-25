/*
  Warnings:

  - A unique constraint covering the columns `[slackIntegrationId]` on the table `Service` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum: Add WHATSAPP value if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'WHATSAPP' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationChannel')
    ) THEN
        ALTER TYPE "NotificationChannel" ADD VALUE 'WHATSAPP';
    END IF;
END $$;

-- AlterTable: Add notificationChannels if it doesn't exist, or alter type if it exists as TEXT[]
DO $$
BEGIN
    -- Check if column exists and what type it is
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'EscalationRule' 
        AND column_name = 'notificationChannels'
        AND data_type = 'ARRAY'
    ) THEN
        -- Column exists, check if it's TEXT[] and needs conversion
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'EscalationRule' 
            AND column_name = 'notificationChannels'
            AND udt_name = '_text'
        ) THEN
            -- Convert TEXT[] to NotificationChannel[]
            ALTER TABLE "EscalationRule" 
            ALTER COLUMN "notificationChannels" TYPE "NotificationChannel"[] 
            USING "notificationChannels"::text[]::"NotificationChannel"[];
        END IF;
    ELSE
        -- Column doesn't exist, add it
        ALTER TABLE "EscalationRule" 
        ADD COLUMN "notificationChannels" "NotificationChannel"[];
    END IF;
END $$;

-- Add notifyOnlyTeamLead if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'EscalationRule' 
        AND column_name = 'notifyOnlyTeamLead'
    ) THEN
        ALTER TABLE "EscalationRule" 
        ADD COLUMN "notifyOnlyTeamLead" BOOLEAN NOT NULL DEFAULT false;
    ELSE
        -- Column exists, ensure it has default value
        ALTER TABLE "EscalationRule" 
        ALTER COLUMN "notifyOnlyTeamLead" SET DEFAULT false;
    END IF;
END $$;

-- AlterTable: Add attempts if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Notification' 
        AND column_name = 'attempts'
    ) THEN
        ALTER TABLE "Notification" 
        ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
    ELSE
        -- Column exists, ensure it has default value
        ALTER TABLE "Notification" 
        ALTER COLUMN "attempts" SET DEFAULT 0;
    END IF;
END $$;

-- AlterTable: Add serviceNotificationChannels if it doesn't exist
ALTER TABLE "Service" 
ADD COLUMN IF NOT EXISTS "serviceNotificationChannels" "NotificationChannel"[] DEFAULT ARRAY['SLACK', 'WEBHOOK']::"NotificationChannel"[];

-- Add other Service columns if they don't exist
ALTER TABLE "Service" 
ADD COLUMN IF NOT EXISTS "slackChannel" TEXT,
ADD COLUMN IF NOT EXISTS "slackIntegrationId" TEXT,
ADD COLUMN IF NOT EXISTS "slackWorkspaceId" TEXT;

-- AlterTable: Add teamLeadId if it doesn't exist
ALTER TABLE "Team" 
ADD COLUMN IF NOT EXISTS "teamLeadId" TEXT;

-- AlterTable: Add whatsappNotificationsEnabled if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' 
        AND column_name = 'whatsappNotificationsEnabled'
    ) THEN
        ALTER TABLE "User" 
        ADD COLUMN "whatsappNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false;
    ELSE
        -- Column exists, ensure it has default value
        ALTER TABLE "User" 
        ALTER COLUMN "whatsappNotificationsEnabled" SET DEFAULT false;
    END IF;
END $$;

-- CreateTable: Create WebhookIntegration if it doesn't exist
CREATE TABLE IF NOT EXISTS "WebhookIntegration" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "channel" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Create SlackIntegration if it doesn't exist
CREATE TABLE IF NOT EXISTS "SlackIntegration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "workspaceName" TEXT,
    "botToken" TEXT NOT NULL,
    "signingSecret" TEXT,
    "installedBy" TEXT NOT NULL,
    "scopes" TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlackIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Create UserDevice if it doesn't exist
CREATE TABLE IF NOT EXISTS "UserDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "userAgent" TEXT,
    "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "WebhookIntegration_serviceId_idx" ON "WebhookIntegration"("serviceId");

-- CreateIndex: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "SlackIntegration_workspaceId_idx" ON "SlackIntegration"("workspaceId");

CREATE UNIQUE INDEX IF NOT EXISTS "SlackIntegration_workspaceId_key" ON "SlackIntegration"("workspaceId");

CREATE INDEX IF NOT EXISTS "UserDevice_userId_idx" ON "UserDevice"("userId");

CREATE INDEX IF NOT EXISTS "UserDevice_token_idx" ON "UserDevice"("token");

CREATE UNIQUE INDEX IF NOT EXISTS "UserDevice_userId_deviceId_key" ON "UserDevice"("userId", "deviceId");

CREATE INDEX IF NOT EXISTS "Incident_serviceId_dedupKey_status_idx" ON "Incident"("serviceId", "dedupKey", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "Service_slackIntegrationId_key" ON "Service"("slackIntegrationId");

-- AddForeignKey: Add foreign keys if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Team_teamLeadId_fkey'
    ) THEN
        ALTER TABLE "Team" ADD CONSTRAINT "Team_teamLeadId_fkey" 
        FOREIGN KEY ("teamLeadId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Service_slackIntegrationId_fkey'
    ) THEN
        ALTER TABLE "Service" ADD CONSTRAINT "Service_slackIntegrationId_fkey" 
        FOREIGN KEY ("slackIntegrationId") REFERENCES "SlackIntegration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'WebhookIntegration_serviceId_fkey'
    ) THEN
        ALTER TABLE "WebhookIntegration" ADD CONSTRAINT "WebhookIntegration_serviceId_fkey" 
        FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'SlackIntegration_installedBy_fkey'
    ) THEN
        ALTER TABLE "SlackIntegration" ADD CONSTRAINT "SlackIntegration_installedBy_fkey" 
        FOREIGN KEY ("installedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'UserDevice_userId_fkey'
    ) THEN
        ALTER TABLE "UserDevice" ADD CONSTRAINT "UserDevice_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
