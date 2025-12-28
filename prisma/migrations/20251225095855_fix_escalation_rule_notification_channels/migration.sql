-- AlterTable: Ensure notificationChannels exists with correct type
-- This migration handles all possible states:
-- 1. Column doesn't exist -> Add it
-- 2. Column exists as TEXT[] -> Convert to NotificationChannel[]
-- 3. Column exists as NotificationChannel[] -> Do nothing (already correct)
DO $$
DECLARE
    col_exists BOOLEAN;
    current_udt_name TEXT;
BEGIN
    -- Check if column exists and get its type
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'EscalationRule' 
        AND column_name = 'notificationChannels'
    ) INTO col_exists;

    IF col_exists THEN
        -- Get the UDT name to check the actual type
        SELECT udt_name INTO current_udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'EscalationRule' 
        AND column_name = 'notificationChannels';

        -- If it's TEXT[] (udt_name = '_text'), convert it
        IF current_udt_name = '_text' THEN
            -- Convert TEXT[] to NotificationChannel[]
            ALTER TABLE "EscalationRule" 
            ALTER COLUMN "notificationChannels" TYPE "NotificationChannel"[] 
            USING "notificationChannels"::text[]::"NotificationChannel"[];
        ELSIF current_udt_name NOT LIKE '%NotificationChannel%' THEN
            -- Unexpected type, but try to convert anyway
            BEGIN
                ALTER TABLE "EscalationRule" 
                ALTER COLUMN "notificationChannels" TYPE "NotificationChannel"[] 
                USING "notificationChannels"::text[]::"NotificationChannel"[];
            EXCEPTION WHEN OTHERS THEN
                -- If conversion fails, drop and recreate
                ALTER TABLE "EscalationRule" DROP COLUMN "notificationChannels";
                ALTER TABLE "EscalationRule" ADD COLUMN "notificationChannels" "NotificationChannel"[];
            END;
        END IF;
        -- If it's already NotificationChannel[], do nothing
    ELSE
        -- Column doesn't exist, add it
        ALTER TABLE "EscalationRule" 
        ADD COLUMN "notificationChannels" "NotificationChannel"[];
    END IF;
END $$;
