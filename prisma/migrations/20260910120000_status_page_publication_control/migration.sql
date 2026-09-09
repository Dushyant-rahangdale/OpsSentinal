-- Serving decision for public readers, separate from the revision fence.
--
-- `revision` <> `publishedRevision` only says a snapshot is out of date; it cannot say *why*.
-- Withholding a page is correct when a disclosure was retracted and wrong when the page is merely
-- being rebuilt, so the reason has to be durable. FAIL_CLOSED is the default precisely so that any
-- write path which forgets to record a decision degrades to today's withhold-everything behaviour.
ALTER TABLE "StatusPageSnapshot"
  ADD COLUMN "servingState" TEXT NOT NULL DEFAULT 'FAIL_CLOSED';

-- Pages that are healthy right now keep serving across the deploy. Dirty pages stay dark exactly as
-- they are today, so this migration is behaviour-neutral on its own.
UPDATE "StatusPageSnapshot"
   SET "servingState" = 'LIVE'
 WHERE "publishedRevision" = "revision"
   AND "payload" IS NOT NULL;

ALTER TABLE "StatusPageSnapshot"
  ADD CONSTRAINT "StatusPageSnapshot_servingState_check"
  CHECK ("servingState" IN ('LIVE', 'STALE_OK', 'FAIL_CLOSED', 'DISABLED'));

-- The reconciler selects on `publishedRevision <> revision OR generatedAt < now() - interval`,
-- ordered by generatedAt. Index each branch so the planner can BitmapOr instead of seq-scanning.
-- Column-to-column <> on bigint is immutable, so the partial predicate is legal; it is not
-- expressible in the Prisma schema (cf. "StatusPage_single_default_idx").
CREATE INDEX "StatusPageSnapshot_dirty_generatedAt_idx"
  ON "StatusPageSnapshot" ("generatedAt" ASC NULLS FIRST)
  WHERE "publishedRevision" <> "revision";

-- Mirrors @@index([generatedAt]) on the Prisma model; serves the time-refresh branch of the same query.
CREATE INDEX "StatusPageSnapshot_generatedAt_idx"
  ON "StatusPageSnapshot" ("generatedAt");
