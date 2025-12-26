-- Update status page to be public when enabled
UPDATE "StatusPage" 
SET "requireAuth" = false 
WHERE "enabled" = true;
