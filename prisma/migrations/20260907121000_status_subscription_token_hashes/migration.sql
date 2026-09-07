-- Hash existing bearer tokens without invalidating links already sent by email.
UPDATE "StatusPageSubscription" SET "token" = 'sha256:' || encode(sha256(convert_to("token", 'UTF8')), 'hex');
UPDATE "StatusPageSubscription" SET "verificationToken" = 'sha256:' || encode(sha256(convert_to("verificationToken", 'UTF8')), 'hex')
WHERE "verificationToken" IS NOT NULL;
CREATE TABLE "StatusPageSubscriptionToken" (
  "tokenHash" TEXT PRIMARY KEY,
  "subscriptionId" TEXT NOT NULL REFERENCES "StatusPageSubscription"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "StatusPageSubscriptionToken_subscriptionId_idx" ON "StatusPageSubscriptionToken"("subscriptionId");
