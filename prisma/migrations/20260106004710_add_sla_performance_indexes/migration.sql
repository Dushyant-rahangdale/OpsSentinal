-- Add SLA Performance Indexes for World-Class Query Performance

-- Alert SLA Performance Indexes
CREATE INDEX IF NOT EXISTS "idx_alert_retention" ON "Alert"("createdAt", "incidentId");
CREATE INDEX IF NOT EXISTS "idx_alert_by_service" ON "Alert"("serviceId", "createdAt");

-- Incident SLA Performance Indexes
CREATE INDEX IF NOT EXISTS "idx_incident_retention" ON "Incident"("createdAt", "status");
CREATE INDEX IF NOT EXISTS "idx_incident_sla_by_service" ON "Incident"("serviceId", "createdAt", "status");
CREATE INDEX IF NOT EXISTS "idx_incident_mtta_calc" ON "Incident"("createdAt", "acknowledgedAt");
CREATE INDEX IF NOT EXISTS "idx_incident_mttr_calc" ON "Incident"("createdAt", "resolvedAt", "status");
CREATE INDEX IF NOT EXISTS "idx_incident_assignee_load" ON "Incident"("assigneeId", "createdAt", "status");

-- IncidentEvent SLA Indexes
CREATE INDEX IF NOT EXISTS "idx_event_timeline" ON "IncidentEvent"("incidentId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_event_ack_search" ON "IncidentEvent"("incidentId", "message", "createdAt");

-- OnCallShift Coverage Indexes
CREATE INDEX IF NOT EXISTS "idx_shift_coverage" ON "OnCallShift"("start", "end");
CREATE INDEX IF NOT EXISTS "idx_shift_user_load" ON "OnCallShift"("userId", "start", "end");

-- Add SLAPerformanceLog table for real-time performance monitoring
CREATE TABLE IF NOT EXISTS "SLAPerformanceLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serviceId" TEXT,
    "teamId" TEXT,
    "windowDays" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "incidentCount" INTEGER NOT NULL,

    CONSTRAINT "SLAPerformanceLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SLAPerformanceLog_timestamp_idx" ON "SLAPerformanceLog"("timestamp");
CREATE INDEX IF NOT EXISTS "SLAPerformanceLog_durationMs_idx" ON "SLAPerformanceLog"("durationMs");
