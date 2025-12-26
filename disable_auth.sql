UPDATE "StatusPage" SET "requireAuth" = false WHERE id = (SELECT id FROM "StatusPage" LIMIT 1);
