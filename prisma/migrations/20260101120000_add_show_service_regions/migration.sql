-- Add StatusPage.showServiceRegions column
ALTER TABLE "StatusPage" ADD COLUMN IF NOT EXISTS "showServiceRegions" BOOLEAN NOT NULL DEFAULT true;

-- Add StatusPage.showServicesByRegion column
ALTER TABLE "StatusPage" ADD COLUMN IF NOT EXISTS "showServicesByRegion" BOOLEAN NOT NULL DEFAULT false;
