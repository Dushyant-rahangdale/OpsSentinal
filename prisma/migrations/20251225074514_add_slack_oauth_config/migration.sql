-- DropForeignKey: Drop foreign key if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Service_slackIntegrationId_fkey'
        AND table_name = 'Service'
    ) THEN
        ALTER TABLE "Service" DROP CONSTRAINT "Service_slackIntegrationId_fkey";
    END IF;
END $$;

-- AlterTable: Add notificationChannels if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'EscalationRule' 
        AND column_name = 'notificationChannels'
    ) THEN
        ALTER TABLE "EscalationRule" 
        ADD COLUMN "notificationChannels" "NotificationChannel"[];
    END IF;
END $$;

-- AlterTable: Update serviceNotificationChannels default if column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Service' 
        AND column_name = 'serviceNotificationChannels'
    ) THEN
        ALTER TABLE "Service" 
        ALTER COLUMN "serviceNotificationChannels" SET DEFAULT ARRAY[]::"NotificationChannel"[];
    END IF;
END $$;

-- CreateTable: Create SlackOAuthConfig if it doesn't exist
CREATE TABLE IF NOT EXISTS "SlackOAuthConfig" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "redirectUri" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "SlackOAuthConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Create unique index if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS "SlackOAuthConfig_id_key" ON "SlackOAuthConfig"("id");

-- AddForeignKey: Add foreign key if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Service_slackIntegrationId_fkey'
        AND table_name = 'Service'
    ) THEN
        ALTER TABLE "Service" 
        ADD CONSTRAINT "Service_slackIntegrationId_fkey" 
        FOREIGN KEY ("slackIntegrationId") REFERENCES "SlackIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Add SlackOAuthConfig foreign key if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'SlackOAuthConfig_updatedBy_fkey'
        AND table_name = 'SlackOAuthConfig'
    ) THEN
        ALTER TABLE "SlackOAuthConfig" 
        ADD CONSTRAINT "SlackOAuthConfig_updatedBy_fkey" 
        FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
