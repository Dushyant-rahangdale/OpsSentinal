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
  "sealedAt" TIMESTAMP(3),
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
UPDATE "IncidentSlaPolicy" SET "sealedAt" = CURRENT_TIMESTAMP;

CREATE FUNCTION opsknight_immutable_incident_sla_policy() RETURNS TRIGGER AS $$
BEGIN
  -- A draft may be sealed exactly once. No other field can change during that transition.
  IF TG_OP = 'UPDATE'
    AND OLD."sealedAt" IS NULL AND NEW."sealedAt" IS NOT NULL
    AND NEW."id" IS NOT DISTINCT FROM OLD."id"
    AND NEW."scopeKey" IS NOT DISTINCT FROM OLD."scopeKey"
    AND NEW."version" IS NOT DISTINCT FROM OLD."version"
    AND NEW."inheritWorkspace" IS NOT DISTINCT FROM OLD."inheritWorkspace"
    AND NEW."baseAckTargetMs" IS NOT DISTINCT FROM OLD."baseAckTargetMs"
    AND NEW."baseResolveTargetMs" IS NOT DISTINCT FROM OLD."baseResolveTargetMs"
    AND NEW."createdAt" IS NOT DISTINCT FROM OLD."createdAt"
    AND NEW."createdById" IS NOT DISTINCT FROM OLD."createdById" THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'incident SLA policy versions and rules are append-only' USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;
CREATE FUNCTION opsknight_reject_rule_for_sealed_sla_policy() RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "IncidentSlaPolicy"
    WHERE "id" = NEW."policyId" AND "sealedAt" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'cannot extend a sealed incident SLA policy' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER incident_sla_policy_immutable BEFORE UPDATE OR DELETE ON "IncidentSlaPolicy"
FOR EACH ROW EXECUTE FUNCTION opsknight_immutable_incident_sla_policy();
CREATE TRIGGER incident_sla_rule_immutable BEFORE UPDATE OR DELETE ON "IncidentSlaPolicyRule"
FOR EACH ROW EXECUTE FUNCTION opsknight_immutable_incident_sla_policy();
CREATE TRIGGER incident_sla_rule_sealed_insert BEFORE INSERT ON "IncidentSlaPolicyRule"
FOR EACH ROW EXECUTE FUNCTION opsknight_reject_rule_for_sealed_sla_policy();
-- Rules may be inserted only while a policy is an unpublished draft. The application
-- creates rules and seals the policy in one transaction, so readers never observe drafts.
-- Existing INSERT trigger remains attached. Replace its function, not the protection.
-- Old explicit writers retain honest NULL provenance and are counted; target-less writers
-- get the same persisted policy resolution as the application, with accurate provenance.
CREATE OR REPLACE FUNCTION opsknight_capture_incident_sla_target() RETURNS TRIGGER AS $$
DECLARE p "IncidentSlaPolicy"%ROWTYPE; r "IncidentSlaPolicyRule"%ROWTYPE; normalized_priority TEXT; ack_minutes INTEGER; resolve_minutes INTEGER;
BEGIN
  IF NEW."slaPolicyId" IS NULL THEN
    INSERT INTO "IncidentSlaLegacyCapture" ("day","count","lastSeenAt") VALUES (CURRENT_DATE,1,CURRENT_TIMESTAMP)
    ON CONFLICT ("day") DO UPDATE SET "count" = "IncidentSlaLegacyCapture"."count" + 1, "lastSeenAt" = CURRENT_TIMESTAMP;
  END IF;
  IF NEW."slaAckTargetMs" IS NOT NULL AND NEW."slaAckTargetMs" > 0 AND NEW."slaResolveTargetMs" IS NOT NULL AND NEW."slaResolveTargetMs" > 0 THEN
    NEW."slaTargetSource" := COALESCE(NULLIF(NEW."slaTargetSource",''),'EXPLICIT');
    NEW."slaTargetCapturedAt" := COALESCE(NEW."slaTargetCapturedAt",CURRENT_TIMESTAMP);
  ELSE
    SELECT * INTO p FROM "IncidentSlaPolicy" WHERE "scopeKey" = 'service:' || NEW."serviceId" AND "sealedAt" IS NOT NULL ORDER BY "version" DESC LIMIT 1;
    normalized_priority := CONCAT('P',REGEXP_REPLACE(BTRIM(UPPER(COALESCE(NEW."priority",''))),'^P',''));
    SELECT * INTO r FROM "IncidentSlaPolicyRule" WHERE "policyId" = p."id" AND "priority" = normalized_priority;
    IF r."id" IS NOT NULL THEN
      NEW."slaAckTargetMs" := r."ackTargetMs"; NEW."slaResolveTargetMs" := r."resolveTargetMs";
      NEW."slaTargetSource" := 'SERVICE_PRIORITY_OVERRIDE'; NEW."slaPolicyRule" := r."priority";
    ELSE
      -- A service created after this migration has no versioned service policy yet.
      -- Preserve the pre-migration trigger contract for those legacy writers; only an
      -- explicit service policy configured to inherit may delegate to the workspace.
      IF p."id" IS NOT NULL AND p."inheritWorkspace" THEN
        SELECT * INTO p FROM "IncidentSlaPolicy" WHERE "scopeKey" = 'workspace' AND "sealedAt" IS NOT NULL ORDER BY "version" DESC LIMIT 1;
      END IF;
      IF p."id" IS NULL THEN
        SELECT NULLIF("targetAckMinutes", 0), NULLIF("targetResolveMinutes", 0)
          INTO ack_minutes, resolve_minutes FROM "Service" WHERE "id" = NEW."serviceId";
        IF normalized_priority = 'P1' THEN ack_minutes := 5; resolve_minutes := 60; NEW."slaTargetSource" := 'PRIORITY';
        ELSIF normalized_priority = 'P2' THEN ack_minutes := 15; resolve_minutes := 240; NEW."slaTargetSource" := 'PRIORITY';
        ELSIF normalized_priority = 'P3' THEN ack_minutes := 30; resolve_minutes := 480; NEW."slaTargetSource" := 'PRIORITY';
        ELSIF normalized_priority = 'P4' THEN ack_minutes := 60; resolve_minutes := 1440; NEW."slaTargetSource" := 'PRIORITY';
        ELSIF normalized_priority = 'P5' THEN ack_minutes := 120; resolve_minutes := 2880; NEW."slaTargetSource" := 'PRIORITY';
        ELSE NEW."slaTargetSource" := 'SERVICE';
        END IF;
        NEW."slaAckTargetMs" := COALESCE(ack_minutes, 15) * 60000;
        NEW."slaResolveTargetMs" := COALESCE(resolve_minutes, 120) * 60000;
        NEW."slaPolicyId" := NULL; NEW."slaPolicyVersion" := NULL; NEW."slaPolicyRule" := NULL;
      ELSE
        NEW."slaAckTargetMs" := p."baseAckTargetMs"; NEW."slaResolveTargetMs" := p."baseResolveTargetMs";
        NEW."slaTargetSource" := CASE WHEN p."scopeKey" = 'workspace' THEN 'WORKSPACE_DEFAULT' ELSE 'SERVICE_DEFAULT' END;
        NEW."slaPolicyRule" := 'BASE';
        NEW."slaPolicyId" := p."id"; NEW."slaPolicyVersion" := p."version";
      END IF;
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
