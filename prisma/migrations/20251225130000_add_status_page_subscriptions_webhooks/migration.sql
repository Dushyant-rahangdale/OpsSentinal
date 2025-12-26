-- CreateTable
CREATE TABLE "StatusPageSubscription" (
    "id" TEXT NOT NULL,
    "statusPageId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "token" TEXT NOT NULL,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "preferences" JSONB,

    CONSTRAINT "StatusPageSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusPageWebhook" (
    "id" TEXT NOT NULL,
    "statusPageId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatusPageWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StatusPageSubscription_token_key" ON "StatusPageSubscription"("token");

-- CreateIndex
CREATE UNIQUE INDEX "StatusPageSubscription_statusPageId_email_key" ON "StatusPageSubscription"("statusPageId", "email");

-- CreateIndex
CREATE INDEX "StatusPageSubscription_statusPageId_verified_idx" ON "StatusPageSubscription"("statusPageId", "verified");

-- CreateIndex
CREATE INDEX "StatusPageSubscription_token_idx" ON "StatusPageSubscription"("token");

-- CreateIndex
CREATE INDEX "StatusPageWebhook_statusPageId_enabled_idx" ON "StatusPageWebhook"("statusPageId", "enabled");

-- AddForeignKey
ALTER TABLE "StatusPageSubscription" ADD CONSTRAINT "StatusPageSubscription_statusPageId_fkey" FOREIGN KEY ("statusPageId") REFERENCES "StatusPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusPageWebhook" ADD CONSTRAINT "StatusPageWebhook_statusPageId_fkey" FOREIGN KEY ("statusPageId") REFERENCES "StatusPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

