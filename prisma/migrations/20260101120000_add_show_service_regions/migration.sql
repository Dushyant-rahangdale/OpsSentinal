-- Add StatusPage.showServiceRegions column
ALTER TABLE "StatusPage" ADD COLUMN IF NOT EXISTS "showServiceRegions" BOOLEAN NOT NULL DEFAULT true;
