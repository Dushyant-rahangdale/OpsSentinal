-- Add partial unique index to prevent duplicate active incidents per service/dedup key
CREATE UNIQUE INDEX "Incident_active_dedup_key"
ON "Incident" ("serviceId", "dedupKey")
WHERE "dedupKey" IS NOT NULL AND "status" <> 'RESOLVED';

-- Enforce basic timestamp consistency
ALTER TABLE "Incident"
ADD CONSTRAINT "Incident_resolved_after_created"
CHECK ("resolvedAt" IS NULL OR "resolvedAt" >= "createdAt");

ALTER TABLE "Incident"
ADD CONSTRAINT "Incident_acknowledged_after_created"
CHECK ("acknowledgedAt" IS NULL OR "acknowledgedAt" >= "createdAt");
