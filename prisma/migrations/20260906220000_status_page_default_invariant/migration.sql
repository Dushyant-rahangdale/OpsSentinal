-- Repair legacy zero/multiple-default states deterministically before fencing.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    ORDER BY "isDefault" DESC, "createdAt" ASC, "id" ASC
  ) AS position
  FROM "StatusPage"
)
UPDATE "StatusPage" AS page
SET "isDefault" = (ranked.position = 1)
FROM ranked
WHERE page."id" = ranked."id"
  AND page."isDefault" IS DISTINCT FROM (ranked.position = 1);

-- At most one status page may own legacy/default routing at a time.
-- Lifecycle operations serialize creation, promotion, and deletion with a
-- transaction-scoped advisory lock so a non-empty collection retains one default.
CREATE UNIQUE INDEX IF NOT EXISTS "StatusPage_single_default_idx"
ON "StatusPage" ("isDefault")
WHERE "isDefault" = true;
