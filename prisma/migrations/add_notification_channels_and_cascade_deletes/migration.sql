-- Add notification channels to EscalationRule
ALTER TABLE "EscalationRule" ADD COLUMN IF NOT EXISTS "notificationChannels" TEXT[] DEFAULT ARRAY['EMAIL']::TEXT[];

-- Add notification channels to Service
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "notificationChannels" TEXT[] DEFAULT ARRAY['EMAIL', 'SLACK']::TEXT[];

-- Add cascade delete to IncidentEvent
ALTER TABLE "IncidentEvent" DROP CONSTRAINT IF EXISTS "IncidentEvent_incidentId_fkey";
ALTER TABLE "IncidentEvent" ADD CONSTRAINT "IncidentEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add cascade delete to IncidentNote
ALTER TABLE "IncidentNote" DROP CONSTRAINT IF EXISTS "IncidentNote_incidentId_fkey";
ALTER TABLE "IncidentNote" ADD CONSTRAINT "IncidentNote_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add cascade delete to IncidentWatcher
ALTER TABLE "IncidentWatcher" DROP CONSTRAINT IF EXISTS "IncidentWatcher_incidentId_fkey";
ALTER TABLE "IncidentWatcher" ADD CONSTRAINT "IncidentWatcher_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;








