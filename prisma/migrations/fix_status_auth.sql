-- Migration to set requireAuth to false for enabled status pages
-- This ensures enabled status pages are publicly accessible

UPDATE "StatusPage" 
SET "requireAuth" = false 
WHERE "enabled" = true;

-- Verify the change
SELECT id, name, enabled, "requireAuth" FROM "StatusPage";
