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
