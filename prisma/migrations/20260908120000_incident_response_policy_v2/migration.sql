-- Incident Response Policy v2: additive, rolling-upgrade-safe policy and provenance model.
BEGIN;

CREATE TYPE "IncidentResolutionKind" AS ENUM
  ('MANUAL','SOURCE_RECOVERY','AUTOMATION','AUTO_TIMEOUT','UNKNOWN');

ALTER TABLE "Incident"
  ADD COLUMN "resolutionKind" "IncidentResolutionKind",
  ADD COLUMN "slaPriorityAtCapture" TEXT,
  ADD COLUMN "classificationPrioritySource" TEXT,
  ADD COLUMN "classificationUrgencySource" TEXT,
  ADD COLUMN "classificationPolicyId" TEXT,
  ADD COLUMN "classificationPolicyVersion" INTEGER,
  ADD COLUMN "classificationRule" TEXT;

CREATE TABLE "IncidentClassificationPolicy" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "scopeKey" TEXT NOT NULL,
  "version" INTEGER NOT NULL CHECK ("version" > 0),
  "inheritWorkspace" BOOLEAN NOT NULL,
  "derivePriorityFromUrgency" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "sealedAt" TIMESTAMP(3),
  CONSTRAINT incident_classification_scope CHECK
    ("scopeKey" = 'workspace' OR "scopeKey" ~ '^(service|integration):.+$'),
  CONSTRAINT incident_classification_inheritance CHECK
    ("scopeKey" <> 'workspace' OR NOT "inheritWorkspace")
);
CREATE UNIQUE INDEX "IncidentClassificationPolicy_scopeKey_version_key"
  ON "IncidentClassificationPolicy" ("scopeKey", "version");

CREATE TABLE "IncidentClassificationPolicyRule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "policyId" TEXT NOT NULL REFERENCES "IncidentClassificationPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "matchType" TEXT NOT NULL CHECK ("matchType" IN ('ALERT_SEVERITY')),
  "matchValue" TEXT NOT NULL CHECK ("matchValue" IN ('critical','error','warning','info')),
  "priority" TEXT CHECK ("priority" IS NULL OR "priority" IN ('P1','P2','P3','P4','P5')),
  "urgency" "IncidentUrgency",
  "label" TEXT,
  CONSTRAINT incident_classification_rule_effect CHECK ("priority" IS NOT NULL OR "urgency" IS NOT NULL)
);
CREATE UNIQUE INDEX "IncidentClassificationPolicyRule_policyId_matchType_matchValue_key"
  ON "IncidentClassificationPolicyRule" ("policyId", "matchType", "matchValue");
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_classificationPolicyId_fkey"
  FOREIGN KEY ("classificationPolicyId") REFERENCES "IncidentClassificationPolicy"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve pre-v2 alert semantics as an explicit, auditable workspace policy.
INSERT INTO "IncidentClassificationPolicy"
  ("id","scopeKey","version","inheritWorkspace","derivePriorityFromUrgency")
VALUES ('incident-classification-workspace-v1','workspace',1,false,false);
INSERT INTO "IncidentClassificationPolicyRule"
  ("id","policyId","matchType","matchValue","priority","urgency","label")
VALUES
  ('incident-classification-workspace-v1-critical','incident-classification-workspace-v1','ALERT_SEVERITY','critical','P1','HIGH','Critical alert'),
  ('incident-classification-workspace-v1-error','incident-classification-workspace-v1','ALERT_SEVERITY','error','P2','MEDIUM','Error alert'),
  ('incident-classification-workspace-v1-warning','incident-classification-workspace-v1','ALERT_SEVERITY','warning','P3','MEDIUM','Warning alert'),
  ('incident-classification-workspace-v1-info','incident-classification-workspace-v1','ALERT_SEVERITY','info','P5','LOW','Informational alert');
UPDATE "IncidentClassificationPolicy" SET "sealedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'incident-classification-workspace-v1';

CREATE FUNCTION opsknight_immutable_classification_policy() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND OLD."sealedAt" IS NULL AND NEW."sealedAt" IS NOT NULL
    AND NEW."id" IS NOT DISTINCT FROM OLD."id"
    AND NEW."scopeKey" IS NOT DISTINCT FROM OLD."scopeKey"
    AND NEW."version" IS NOT DISTINCT FROM OLD."version"
    AND NEW."inheritWorkspace" IS NOT DISTINCT FROM OLD."inheritWorkspace"
    AND NEW."derivePriorityFromUrgency" IS NOT DISTINCT FROM OLD."derivePriorityFromUrgency"
    AND NEW."createdAt" IS NOT DISTINCT FROM OLD."createdAt"
    AND NEW."createdById" IS NOT DISTINCT FROM OLD."createdById" THEN RETURN NEW;
  END IF;
  RAISE EXCEPTION 'incident classification policies are append-only' USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;
CREATE FUNCTION opsknight_reject_classification_rule_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'incident classification rules are append-only' USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;
CREATE FUNCTION opsknight_reject_rule_for_sealed_classification_policy() RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "IncidentClassificationPolicy" WHERE "id" = NEW."policyId" AND "sealedAt" IS NOT NULL)
  THEN RAISE EXCEPTION 'cannot extend a sealed classification policy' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER incident_classification_policy_immutable BEFORE UPDATE OR DELETE ON "IncidentClassificationPolicy"
  FOR EACH ROW EXECUTE FUNCTION opsknight_immutable_classification_policy();
CREATE TRIGGER incident_classification_rule_immutable BEFORE UPDATE OR DELETE ON "IncidentClassificationPolicyRule"
  FOR EACH ROW EXECUTE FUNCTION opsknight_reject_classification_rule_mutation();
CREATE TRIGGER incident_classification_rule_sealed_insert BEFORE INSERT ON "IncidentClassificationPolicyRule"
  FOR EACH ROW EXECUTE FUNCTION opsknight_reject_rule_for_sealed_classification_policy();

-- Workspace P1-P5 rules become the canonical defaults. New service versions retain
-- each service base while removing only the known migration-generated v1 rules.
INSERT INTO "IncidentSlaPolicy" ("id","scopeKey","version","inheritWorkspace","baseAckTargetMs","baseResolveTargetMs")
VALUES ('incident-sla-workspace-v2','workspace',2,false,900000,7200000);
INSERT INTO "IncidentSlaPolicyRule" ("id","policyId","priority","ackTargetMs","resolveTargetMs","label") VALUES
  ('incident-sla-workspace-v2-P1','incident-sla-workspace-v2','P1',300000,3600000,'Workspace P1'),
  ('incident-sla-workspace-v2-P2','incident-sla-workspace-v2','P2',900000,14400000,'Workspace P2'),
  ('incident-sla-workspace-v2-P3','incident-sla-workspace-v2','P3',1800000,28800000,'Workspace P3'),
  ('incident-sla-workspace-v2-P4','incident-sla-workspace-v2','P4',3600000,86400000,'Workspace P4'),
  ('incident-sla-workspace-v2-P5','incident-sla-workspace-v2','P5',7200000,172800000,'Workspace P5');
UPDATE "IncidentSlaPolicy" SET "sealedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'incident-sla-workspace-v2';

WITH latest AS (
  SELECT DISTINCT ON ("scopeKey") * FROM "IncidentSlaPolicy"
  WHERE "scopeKey" LIKE 'service:%' AND "sealedAt" IS NOT NULL
  ORDER BY "scopeKey", "version" DESC
)
INSERT INTO "IncidentSlaPolicy"
  ("id","scopeKey","version","inheritWorkspace","baseAckTargetMs","baseResolveTargetMs")
SELECT 'incident-response-v2-' || md5("scopeKey" || ':' || "version"::text), "scopeKey", "version" + 1,
       "inheritWorkspace", "baseAckTargetMs", "baseResolveTargetMs"
FROM latest;

-- Preserve real customer-authored service rules; only the exact legacy seed is replaced
-- by workspace defaults.
WITH latest AS (
  SELECT DISTINCT ON ("scopeKey") * FROM "IncidentSlaPolicy"
  WHERE "scopeKey" LIKE 'service:%' AND "sealedAt" IS NOT NULL
    AND "id" NOT LIKE 'incident-response-v2-%'
  ORDER BY "scopeKey", "version" DESC
), destination AS (
  SELECT p."id", p."scopeKey" FROM "IncidentSlaPolicy" p WHERE p."id" LIKE 'incident-response-v2-%'
)
INSERT INTO "IncidentSlaPolicyRule" ("id","policyId","priority","ackTargetMs","resolveTargetMs","label")
SELECT d."id" || '-' || r."priority", d."id", r."priority", r."ackTargetMs", r."resolveTargetMs", r."label"
FROM latest l JOIN destination d USING ("scopeKey")
JOIN "IncidentSlaPolicyRule" r ON r."policyId" = l."id"
WHERE COALESCE(r."label", '') <> 'Legacy seeded priority rule';
UPDATE "IncidentSlaPolicy" SET "sealedAt" = CURRENT_TIMESTAMP
WHERE "id" LIKE 'incident-response-v2-%';

-- Keep rolling-upgrade/legacy writers identical to the application resolver:
-- service priority -> workspace priority -> explicit service base -> workspace base.
CREATE OR REPLACE FUNCTION opsknight_capture_incident_sla_target() RETURNS TRIGGER AS $$
DECLARE
  service_policy "IncidentSlaPolicy"%ROWTYPE;
  workspace_policy "IncidentSlaPolicy"%ROWTYPE;
  selected_policy "IncidentSlaPolicy"%ROWTYPE;
  selected_rule "IncidentSlaPolicyRule"%ROWTYPE;
  normalized_priority TEXT;
  legacy_capture BOOLEAN;
  capture_kind TEXT;
BEGIN
  legacy_capture := NEW."slaPolicyId" IS NULL;
  normalized_priority := CONCAT('P', REGEXP_REPLACE(BTRIM(UPPER(COALESCE(NEW."priority",''))), '^P', ''));
  NEW."slaPriorityAtCapture" := COALESCE(NEW."slaPriorityAtCapture", NULLIF(normalized_priority, 'P'));

  IF NEW."slaAckTargetMs" IS NOT NULL AND NEW."slaAckTargetMs" > 0
    AND NEW."slaResolveTargetMs" IS NOT NULL AND NEW."slaResolveTargetMs" > 0 THEN
    NEW."slaTargetSource" := COALESCE(NULLIF(NEW."slaTargetSource",''),'EXPLICIT');
    NEW."slaTargetCapturedAt" := COALESCE(NEW."slaTargetCapturedAt",CURRENT_TIMESTAMP);
    capture_kind := 'EXPLICIT_NO_PROVENANCE';
  ELSE
    SELECT * INTO service_policy FROM "IncidentSlaPolicy"
      WHERE "scopeKey" = 'service:' || NEW."serviceId" AND "sealedAt" IS NOT NULL
      ORDER BY "version" DESC LIMIT 1;
    SELECT * INTO workspace_policy FROM "IncidentSlaPolicy"
      WHERE "scopeKey" = 'workspace' AND "sealedAt" IS NOT NULL
      ORDER BY "version" DESC LIMIT 1;

    IF service_policy."id" IS NOT NULL THEN
      SELECT * INTO selected_rule FROM "IncidentSlaPolicyRule"
        WHERE "policyId" = service_policy."id" AND "priority" = normalized_priority;
    END IF;
    IF selected_rule."id" IS NULL AND workspace_policy."id" IS NOT NULL THEN
      SELECT * INTO selected_rule FROM "IncidentSlaPolicyRule"
        WHERE "policyId" = workspace_policy."id" AND "priority" = normalized_priority;
    END IF;

    IF selected_rule."id" IS NOT NULL THEN
      IF selected_rule."policyId" = service_policy."id" THEN
        selected_policy := service_policy;
      ELSE
        selected_policy := workspace_policy;
      END IF;
      NEW."slaAckTargetMs" := selected_rule."ackTargetMs";
      NEW."slaResolveTargetMs" := selected_rule."resolveTargetMs";
      NEW."slaTargetSource" := CASE WHEN selected_policy."scopeKey" = 'workspace'
        THEN 'WORKSPACE_PRIORITY_OVERRIDE' ELSE 'SERVICE_PRIORITY_OVERRIDE' END;
      NEW."slaPolicyRule" := selected_rule."priority";
    ELSE
      IF service_policy."id" IS NOT NULL AND NOT service_policy."inheritWorkspace" THEN
        selected_policy := service_policy;
      ELSE
        selected_policy := workspace_policy;
      END IF;
      IF selected_policy."id" IS NULL THEN
        RAISE EXCEPTION 'incident SLA policy is not configured' USING ERRCODE = '23514';
      END IF;
      NEW."slaAckTargetMs" := selected_policy."baseAckTargetMs";
      NEW."slaResolveTargetMs" := selected_policy."baseResolveTargetMs";
      NEW."slaTargetSource" := CASE WHEN selected_policy."scopeKey" = 'workspace'
        THEN 'WORKSPACE_DEFAULT' ELSE 'SERVICE_DEFAULT' END;
      NEW."slaPolicyRule" := 'BASE';
    END IF;
    NEW."slaPolicyId" := selected_policy."id";
    NEW."slaPolicyVersion" := selected_policy."version";
    NEW."slaTargetCapturedAt" := COALESCE(NEW."slaTargetCapturedAt", CURRENT_TIMESTAMP);
    capture_kind := 'POLICY_TRIGGER_CAPTURE';
  END IF;

  IF legacy_capture THEN
    INSERT INTO "IncidentSlaLegacyCapture" ("day","count","lastSeenAt","lastIncidentId","lastServiceId","lastCaptureKind")
    VALUES (CURRENT_DATE,1,CURRENT_TIMESTAMP,NEW."id",NEW."serviceId",capture_kind)
    ON CONFLICT ("day") DO UPDATE SET
      "count" = "IncidentSlaLegacyCapture"."count" + 1,
      "lastSeenAt" = CURRENT_TIMESTAMP,
      "lastIncidentId" = EXCLUDED."lastIncidentId",
      "lastServiceId" = EXCLUDED."lastServiceId",
      "lastCaptureKind" = EXCLUDED."lastCaptureKind";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Resolution provenance for historical rows is necessarily conservative.
UPDATE "Incident" i SET "resolutionKind" = CASE
  WHEN EXISTS (SELECT 1 FROM "IncidentEvent" e WHERE e."incidentId" = i."id" AND e."type" = 'MANUAL_RESOLVED') THEN 'MANUAL'::"IncidentResolutionKind"
  WHEN EXISTS (SELECT 1 FROM "IncidentEvent" e WHERE e."incidentId" = i."id" AND e."type" = 'AUTO_RESOLVED') THEN 'SOURCE_RECOVERY'::"IncidentResolutionKind"
  ELSE 'UNKNOWN'::"IncidentResolutionKind" END
WHERE i."status" = 'RESOLVED' AND i."resolutionKind" IS NULL;

-- Keep provenance structurally consistent during rolling upgrades. Older
-- writers may not yet provide resolutionKind; UNKNOWN deliberately fails
-- closed for ACK compliance instead of misclassifying a manual resolution as
-- an automatic source recovery.
CREATE FUNCTION opsknight_normalize_incident_resolution_kind() RETURNS TRIGGER AS $$
BEGIN
  IF NEW."status" = 'RESOLVED' AND NEW."resolutionKind" IS NULL THEN
    NEW."resolutionKind" := 'UNKNOWN'::"IncidentResolutionKind";
  ELSIF NEW."status" <> 'RESOLVED' THEN
    NEW."resolutionKind" := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER incident_resolution_kind_consistency
  BEFORE INSERT OR UPDATE OF "status", "resolutionKind" ON "Incident"
  FOR EACH ROW EXECUTE FUNCTION opsknight_normalize_incident_resolution_kind();

ALTER TABLE "IncidentMetricRollup"
  ADD COLUMN "ackSlaNotRequired" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "autoResolvedBeforeAck" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "manualResolvedWithoutAck" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sourceRecoveryAfterAckDeadline" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "IncidentMetricRollupByPriority"
  ADD COLUMN "ackSlaNotRequired" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "autoResolvedBeforeAck" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "manualResolvedWithoutAck" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sourceRecoveryAfterAckDeadline" INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION opsknight_prevent_incident_sla_target_mutation() RETURNS TRIGGER AS $$
BEGIN
  IF NEW."slaAckTargetMs" IS DISTINCT FROM OLD."slaAckTargetMs"
    OR NEW."slaResolveTargetMs" IS DISTINCT FROM OLD."slaResolveTargetMs"
    OR NEW."slaTargetSource" IS DISTINCT FROM OLD."slaTargetSource"
    OR NEW."slaTargetCapturedAt" IS DISTINCT FROM OLD."slaTargetCapturedAt"
    OR NEW."slaPolicyId" IS DISTINCT FROM OLD."slaPolicyId"
    OR NEW."slaPolicyVersion" IS DISTINCT FROM OLD."slaPolicyVersion"
    OR NEW."slaPolicyRule" IS DISTINCT FROM OLD."slaPolicyRule"
    OR NEW."slaPriorityAtCapture" IS DISTINCT FROM OLD."slaPriorityAtCapture"
    OR NEW."classificationPrioritySource" IS DISTINCT FROM OLD."classificationPrioritySource"
    OR NEW."classificationUrgencySource" IS DISTINCT FROM OLD."classificationUrgencySource"
    OR NEW."classificationPolicyId" IS DISTINCT FROM OLD."classificationPolicyId"
    OR NEW."classificationPolicyVersion" IS DISTINCT FROM OLD."classificationPolicyVersion"
    OR NEW."classificationRule" IS DISTINCT FROM OLD."classificationRule" THEN
    RAISE EXCEPTION 'incident response contract is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
