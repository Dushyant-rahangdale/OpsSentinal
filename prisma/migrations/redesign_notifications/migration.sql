-- Redesign notification system to be user-based (like PagerDuty)
-- Remove notificationChannels from Service and EscalationRule
-- Add notification preferences to User

-- Add user notification preferences
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailNotificationsEnabled" BOOLEAN DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "smsNotificationsEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pushNotificationsEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;

-- Remove notificationChannels from Service (keep only slackWebhookUrl)
ALTER TABLE "Service" DROP COLUMN IF EXISTS "notificationChannels";

-- Remove notificationChannels from EscalationRule
ALTER TABLE "EscalationRule" DROP COLUMN IF EXISTS "notificationChannels";








