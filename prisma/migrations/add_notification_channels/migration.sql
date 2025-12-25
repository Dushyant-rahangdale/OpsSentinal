-- Add notification channels to EscalationRule
-- This allows each escalation step to specify which notification channels to use
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'EscalationRule' 
        AND column_name = 'notificationChannels'
    ) THEN
        ALTER TABLE "EscalationRule" 
        ADD COLUMN "notificationChannels" TEXT[] DEFAULT ARRAY['EMAIL']::TEXT[];
    END IF;
END $$;

-- Add notification preferences to Service
-- This allows services to specify default notification channels for service-level notifications
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Service' 
        AND column_name = 'notificationChannels'
    ) THEN
        ALTER TABLE "Service" 
        ADD COLUMN "notificationChannels" TEXT[] DEFAULT ARRAY['EMAIL', 'SLACK']::TEXT[];
    END IF;
END $$;










