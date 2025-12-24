-- Add notification channels to EscalationRule
-- This allows each escalation step to specify which notification channels to use
ALTER TABLE "EscalationRule" ADD COLUMN "notificationChannels" TEXT[] DEFAULT ARRAY['EMAIL']::TEXT[];

-- Add notification preferences to Service
-- This allows services to specify default notification channels for service-level notifications
ALTER TABLE "Service" ADD COLUMN "notificationChannels" TEXT[] DEFAULT ARRAY['EMAIL', 'SLACK']::TEXT[];










