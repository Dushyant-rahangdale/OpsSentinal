-- ============================================================================
-- CRITICAL PERFORMANCE INDEXES FOR USER AND SESSION MODELS
-- ============================================================================
-- This migration addresses 2-4 second User.findUnique queries by adding
-- missing indexes.

-- User.email index (PRIMARY OPTIMIZATION)
-- This is the #1 critical index - User lookups by email are taking 2-4 seconds
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- User.role and status indexes for filtering operations
CREATE INDEX IF NOT EXISTS "User_role_status_idx" ON "User"("role", "status");
CREATE INDEX IF NOT EXISTS "User_status_idx" ON "User"("status");

-- Session.userId index for session lookups by user
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

-- Analyze tables for query planner optimization
ANALYZE "User";
ANALYZE "Session";
