-- Add escalation processing lock timestamp
ALTER TABLE "Incident" ADD COLUMN "escalationProcessingAt" TIMESTAMP(3);

-- Index for faster lock lookups
CREATE INDEX "Incident_escalationProcessingAt_idx" ON "Incident" ("escalationProcessingAt");
