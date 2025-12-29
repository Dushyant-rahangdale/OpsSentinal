-- Add missing columns that exist in schema but have no migration

-- Add Service.region column
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "region" TEXT;

-- Add Postmortem.isPublic column
ALTER TABLE "Postmortem" ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT true;

-- Add StatusPage.showSubscribe column  
ALTER TABLE "StatusPage" ADD COLUMN IF NOT EXISTS "showSubscribe" BOOLEAN NOT NULL DEFAULT true;
