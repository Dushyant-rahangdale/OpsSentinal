-- Add performance indexes to improve query performance

-- OnCallShift indexes for date range queries
CREATE INDEX IF NOT EXISTS "OnCallShift_start_end_idx" ON "OnCallShift"("start", "end");
CREATE INDEX IF NOT EXISTS "OnCallShift_userId_start_end_idx" ON "OnCallShift"("userId", "start", "end");

-- InAppNotification composite index for stream queries
CREATE INDEX IF NOT EXISTS "InAppNotification_userId_createdAt_readAt_idx" ON "InAppNotification"("userId", "createdAt", "readAt");

-- Incident indexes for count queries
CREATE INDEX IF NOT EXISTS "Incident_status_urgency_createdAt_idx" ON "Incident"("status", "urgency", "createdAt");
CREATE INDEX IF NOT EXISTS "Incident_status_assigneeId_idx" ON "Incident"("status", "assigneeId");
