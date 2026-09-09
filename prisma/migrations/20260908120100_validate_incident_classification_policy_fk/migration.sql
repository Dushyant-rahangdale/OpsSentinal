-- Deliberately separate from the additive migration: validation can scan the
-- incident table without extending the schema-change lock window.
ALTER TABLE "Incident" VALIDATE CONSTRAINT "Incident_classificationPolicyId_fkey";
