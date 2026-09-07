CREATE TABLE "StatusPageSnapshot" (
  "statusPageId" TEXT PRIMARY KEY REFERENCES "StatusPage"("id") ON DELETE CASCADE,
  "revision" BIGINT NOT NULL DEFAULT 0,
  "publishedRevision" BIGINT NOT NULL DEFAULT -1,
  "generatedAt" TIMESTAMP(3),
  "payload" JSONB,
  "lastError" TEXT
);
CREATE TABLE "StatusPageAsset" (
  "id" TEXT PRIMARY KEY,
  "statusPageId" TEXT NOT NULL REFERENCES "StatusPage"("id") ON DELETE CASCADE,
  "contentType" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "StatusPageAsset_statusPageId_idx" ON "StatusPageAsset"("statusPageId");
INSERT INTO "StatusPageSnapshot" ("statusPageId") SELECT "id" FROM "StatusPage";

-- Invalidation is committed with the source mutation, including writes from older replicas.
CREATE FUNCTION invalidate_status_page_snapshot() RETURNS TRIGGER AS $$
DECLARE page_id TEXT;
BEGIN
  IF TG_TABLE_NAME = 'StatusPage' THEN
    page_id := NEW."id";
  ELSE
    IF TG_OP = 'DELETE' THEN page_id := OLD."statusPageId";
    ELSE page_id := NEW."statusPageId"; END IF;
  END IF;
  INSERT INTO "StatusPageSnapshot" ("statusPageId", "revision")
    SELECT page_id, 1 WHERE EXISTS (SELECT 1 FROM "StatusPage" WHERE "id" = page_id)
    ON CONFLICT ("statusPageId") DO UPDATE SET "revision" = "StatusPageSnapshot"."revision" + 1;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER status_page_snapshot_dirty AFTER INSERT OR UPDATE ON "StatusPage"
FOR EACH ROW EXECUTE FUNCTION invalidate_status_page_snapshot();
CREATE TRIGGER status_mapping_snapshot_dirty AFTER INSERT OR UPDATE OR DELETE ON "StatusPageService"
FOR EACH ROW EXECUTE FUNCTION invalidate_status_page_snapshot();
CREATE TRIGGER status_announcement_snapshot_dirty AFTER INSERT OR UPDATE OR DELETE ON "StatusPageAnnouncement"
FOR EACH ROW EXECUTE FUNCTION invalidate_status_page_snapshot();

CREATE FUNCTION invalidate_service_status_snapshots() RETURNS TRIGGER AS $$
DECLARE service_ids TEXT[];
BEGIN
  IF TG_TABLE_NAME = 'Service' THEN
    IF TG_OP = 'DELETE' THEN service_ids := ARRAY[OLD."id"];
    ELSE service_ids := ARRAY[NEW."id"]; END IF;
  ELSE
    IF TG_OP = 'DELETE' THEN service_ids := ARRAY[OLD."serviceId"];
    ELSIF TG_OP = 'INSERT' THEN service_ids := ARRAY[NEW."serviceId"];
    ELSE service_ids := ARRAY[OLD."serviceId", NEW."serviceId"]; END IF;
  END IF;
  UPDATE "StatusPageSnapshot" SET "revision" = "revision" + 1
  WHERE "statusPageId" IN (SELECT "statusPageId" FROM "StatusPageService" WHERE "serviceId" = ANY(service_ids));
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER incident_status_snapshot_dirty AFTER INSERT OR UPDATE OR DELETE ON "Incident"
FOR EACH ROW EXECUTE FUNCTION invalidate_service_status_snapshots();
CREATE TRIGGER service_status_snapshot_dirty AFTER UPDATE OR DELETE ON "Service"
FOR EACH ROW EXECUTE FUNCTION invalidate_service_status_snapshots();

CREATE FUNCTION invalidate_postmortem_status_snapshots() RETURNS TRIGGER AS $$
DECLARE incident_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN incident_id := OLD."incidentId";
  ELSE incident_id := NEW."incidentId"; END IF;
  UPDATE "StatusPageSnapshot" SET "revision" = "revision" + 1
  WHERE "statusPageId" IN (
    SELECT mapping."statusPageId" FROM "StatusPageService" mapping
    JOIN "Incident" incident ON incident."serviceId" = mapping."serviceId"
    WHERE incident."id" = incident_id
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER postmortem_status_snapshot_dirty AFTER INSERT OR UPDATE OR DELETE ON "Postmortem"
FOR EACH ROW EXECUTE FUNCTION invalidate_postmortem_status_snapshots();
