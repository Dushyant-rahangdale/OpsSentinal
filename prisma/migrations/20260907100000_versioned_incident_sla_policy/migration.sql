-- Additive, file-only rollout. Never rewrite historical Incident contracts/provenance.
-- 24-day configuration cap (2073600000 ms) intentionally fits existing signed INTEGER snapshots.
BEGIN;
CREATE TABLE "IncidentSlaPolicy" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "scopeKey" TEXT NOT NULL,
  "version" INTEGER NOT NULL CHECK ("version" > 0),
  "inheritWorkspace" BOOLEAN NOT NULL,
  "baseAckTargetMs" INTEGER,
  "baseResolveTargetMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  CONSTRAINT incident_sla_policy_scope CHECK ("scopeKey" = 'workspace' OR "scopeKey" LIKE 'service:%'),
  CONSTRAINT incident_sla_policy_base CHECK (
    ("inheritWorkspace" AND "scopeKey" <> 'workspace' AND "baseAckTargetMs" IS NULL AND "baseResolveTargetMs" IS NULL)
    OR (NOT "inheritWorkspace" AND "baseAckTargetMs" IS NOT NULL AND "baseResolveTargetMs" IS NOT NULL
      AND "baseAckTargetMs" > 0 AND "baseResolveTargetMs" > 0)
  )
);
CREATE UNIQUE INDEX "IncidentSlaPolicy_scopeKey_version_key" ON "IncidentSlaPolicy" ("scopeKey", "version");
CREATE TABLE "IncidentSlaPolicyRule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "policyId" TEXT NOT NULL REFERENCES "IncidentSlaPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "priority" TEXT NOT NULL CHECK ("priority" IN ('P1','P2','P3','P4','P5')),
  "ackTargetMs" INTEGER NOT NULL CHECK ("ackTargetMs" > 0 AND "ackTargetMs" <= 2073600000),
  "resolveTargetMs" INTEGER NOT NULL CHECK ("resolveTargetMs" >= "ackTargetMs" AND "resolveTargetMs" <= 2073600000),
  "label" TEXT
);
CREATE UNIQUE INDEX "IncidentSlaPolicyRule_policyId_priority_key" ON "IncidentSlaPolicyRule" ("policyId", "priority");
CREATE TABLE "IncidentSlaLegacyCapture" (
  "day" DATE NOT NULL PRIMARY KEY,
  "count" BIGINT NOT NULL DEFAULT 0,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "Incident" ADD COLUMN "slaPolicyId" TEXT,
  ADD COLUMN "slaPolicyVersion" INTEGER,
  ADD COLUMN "slaPolicyRule" TEXT;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_slaPolicyId_fkey"
  FOREIGN KEY ("slaPolicyId") REFERENCES "IncidentSlaPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Configuration defaults exist as data, never as new-incident runtime constants.
INSERT INTO "IncidentSlaPolicy" ("id","scopeKey","version","inheritWorkspace","baseAckTargetMs","baseResolveTargetMs")
VALUES ('incident-sla-workspace-v1','workspace',1,false,900000,7200000);
INSERT INTO "IncidentSlaPolicy" ("id","scopeKey","version","inheritWorkspace","baseAckTargetMs","baseResolveTargetMs")
SELECT 'incident-sla-service-v1-' || "id", 'service:' || "id", 1, false,
  COALESCE(NULLIF("targetAckMinutes",0),15) * 60000,
  COALESCE(NULLIF("targetResolveMinutes",0),120) * 60000 FROM "Service";
-- These explicit, removable overrides preserve EXACT old priority behavior, even when
-- service bases differ. Removing a rule creates a new version; never deletes old rules.
INSERT INTO "IncidentSlaPolicyRule" ("id","policyId","priority","ackTargetMs","resolveTargetMs","label")
SELECT p."id" || '-' || r.priority, p."id", r.priority, r.ack_ms, r.resolve_ms, 'Legacy seeded priority rule'
FROM "IncidentSlaPolicy" p CROSS JOIN (VALUES
  ('P1',300000,3600000),('P2',900000,14400000),('P3',1800000,28800000),
  ('P4',3600000,86400000),('P5',7200000,172800000)
) r(priority,ack_ms,resolve_ms) WHERE p."scopeKey" LIKE 'service:%';

CREATE FUNCTION opsknight_immutable_incident_sla_policy() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'incident SLA policy versions and rules are append-only' USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER incident_sla_policy_immutable BEFORE UPDATE OR DELETE ON "IncidentSlaPolicy"
FOR EACH ROW EXECUTE FUNCTION opsknight_immutable_incident_sla_policy();
CREATE TRIGGER incident_sla_rule_immutable BEFORE UPDATE OR DELETE ON "IncidentSlaPolicyRule"
FOR EACH ROW EXECUTE FUNCTION opsknight_immutable_incident_sla_policy();
-- Policy snapshots are append-only. Application validation and the unique
-- (policyId, priority) constraint prevent duplicate rules; published snapshots
-- cannot be changed or extended through UPDATE/DELETE.
-- Existing INSERT trigger remains attached. Replace its function, not the protection.
-- Old explicit writers retain honest NULL provenance and are counted; target-less writers
-- get the same persisted policy resolution as the application, with accurate provenance.
CREATE OR REPLACE FUNCTION opsknight_capture_incident_sla_target() RETURNS TRIGGER AS $$
DECLARE p "IncidentSlaPolicy"%ROWTYPE; r "IncidentSlaPolicyRule"%ROWTYPE; normalized_priority TEXT;
BEGIN
  IF NEW."slaPolicyId" IS NULL THEN
    INSERT INTO "IncidentSlaLegacyCapture" ("day","count","lastSeenAt") VALUES (CURRENT_DATE,1,CURRENT_TIMESTAMP)
    ON CONFLICT ("day") DO UPDATE SET "count" = "IncidentSlaLegacyCapture"."count" + 1, "lastSeenAt" = CURRENT_TIMESTAMP;
  END IF;
  IF NEW."slaAckTargetMs" IS NOT NULL AND NEW."slaAckTargetMs" > 0 AND NEW."slaResolveTargetMs" IS NOT NULL AND NEW."slaResolveTargetMs" > 0 THEN
    NEW."slaTargetSource" := COALESCE(NULLIF(NEW."slaTargetSource",''),'EXPLICIT');
    NEW."slaTargetCapturedAt" := COALESCE(NEW."slaTargetCapturedAt",CURRENT_TIMESTAMP);
  ELSE
    SELECT * INTO p FROM "IncidentSlaPolicy" WHERE "scopeKey" = 'service:' || NEW."serviceId" ORDER BY "version" DESC LIMIT 1;
    normalized_priority := CONCAT('P',REGEXP_REPLACE(BTRIM(UPPER(COALESCE(NEW."priority",''))),'^P',''));
    SELECT * INTO r FROM "IncidentSlaPolicyRule" WHERE "policyId" = p."id" AND "priority" = normalized_priority;
    IF r."id" IS NOT NULL THEN
      NEW."slaAckTargetMs" := r."ackTargetMs"; NEW."slaResolveTargetMs" := r."resolveTargetMs";
      NEW."slaTargetSource" := 'SERVICE_PRIORITY_OVERRIDE'; NEW."slaPolicyRule" := r."priority";
    ELSE
      IF p."id" IS NULL OR p."inheritWorkspace" THEN
        SELECT * INTO p FROM "IncidentSlaPolicy" WHERE "scopeKey" = 'workspace' ORDER BY "version" DESC LIMIT 1;
      END IF;
      IF p."id" IS NULL THEN RAISE EXCEPTION 'workspace incident SLA policy is missing'; END IF;
      NEW."slaAckTargetMs" := p."baseAckTargetMs"; NEW."slaResolveTargetMs" := p."baseResolveTargetMs";
      NEW."slaTargetSource" := CASE WHEN p."scopeKey" = 'workspace' THEN 'WORKSPACE_DEFAULT' ELSE 'SERVICE_DEFAULT' END;
      NEW."slaPolicyRule" := 'BASE';
    END IF;
    NEW."slaPolicyId" := p."id"; NEW."slaPolicyVersion" := p."version";
    NEW."slaTargetCapturedAt" := COALESCE(NEW."slaTargetCapturedAt",CURRENT_TIMESTAMP);
  END IF;
  -- Numerical targets and provenance are protected by the existing immutable
  -- incident trigger. Application policy resolution owns semantic validation.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION opsknight_prevent_incident_sla_target_mutation() RETURNS TRIGGER AS $$
BEGIN
  IF NEW."slaAckTargetMs" IS DISTINCT FROM OLD."slaAckTargetMs"
    OR NEW."slaResolveTargetMs" IS DISTINCT FROM OLD."slaResolveTargetMs"
    OR NEW."slaTargetSource" IS DISTINCT FROM OLD."slaTargetSource"
    OR NEW."slaTargetCapturedAt" IS DISTINCT FROM OLD."slaTargetCapturedAt"
    OR NEW."slaPolicyId" IS DISTINCT FROM OLD."slaPolicyId"
    OR NEW."slaPolicyVersion" IS DISTINCT FROM OLD."slaPolicyVersion"
    OR NEW."slaPolicyRule" IS DISTINCT FROM OLD."slaPolicyRule" THEN
    RAISE EXCEPTION 'incident SLA target contract is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
COMMIT;
