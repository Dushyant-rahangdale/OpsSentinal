/*
  Warnings:

  - You are about to drop the column `notifyOnAcknowledged` on the `SystemSettings` table. All the data in the column will be lost.
  - You are about to drop the column `notifyOnResolved` on the `SystemSettings` table. All the data in the column will be lost.
  - You are about to drop the column `notifyOnSnoozed` on the `SystemSettings` table. All the data in the column will be lost.
  - You are about to drop the column `notifyOnSuppressed` on the `SystemSettings` table. All the data in the column will be lost.
  - You are about to drop the column `notifyOnTriggered` on the `SystemSettings` table. All the data in the column will be lost.
  - You are about to drop the column `notifyOnUnacknowledge` on the `SystemSettings` table. All the data in the column will be lost.
  - You are about to drop the column `notifyOnUnsnooze` on the `SystemSettings` table. All the data in the column will be lost.
  - You are about to drop the column `notifyOnUnsuppress` on the `SystemSettings` table. All the data in the column will be lost.
  - You are about to drop the column `notifyOnUpdated` on the `SystemSettings` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id]` on the table `OidcConfig` will be added. If there are existing duplicate values, this will fail.
  - Made the column `issuer` on table `OidcConfig` required. This step will fail if there are existing NULL values in that column.
  - Made the column `clientId` on table `OidcConfig` required. This step will fail if there are existing NULL values in that column.
  - Made the column `clientSecret` on table `OidcConfig` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedBy` on table `OidcConfig` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "OidcConfig" DROP CONSTRAINT "OidcConfig_updatedBy_fkey";

-- DropIndex
DROP INDEX "InAppNotification_userId_createdAt_readAt_idx";

-- AlterTable
ALTER TABLE "EscalationRule" ADD COLUMN     "notificationChannels" "NotificationChannel"[];

-- AlterTable
ALTER TABLE "OidcConfig" ALTER COLUMN "id" SET DEFAULT 'default',
ALTER COLUMN "enabled" SET DEFAULT true,
ALTER COLUMN "issuer" SET NOT NULL,
ALTER COLUMN "clientId" SET NOT NULL,
ALTER COLUMN "clientSecret" SET NOT NULL,
ALTER COLUMN "autoProvision" SET DEFAULT true,
ALTER COLUMN "updatedBy" SET NOT NULL;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "slaTier" TEXT;

-- AlterTable
ALTER TABLE "StatusPage" ADD COLUMN     "enableUptimeExports" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showChangelog" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showPostIncidentReview" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showRegionHeatmap" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showServiceOwners" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showServiceSlaTier" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "statusApiRateLimitEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "statusApiRateLimitMax" INTEGER NOT NULL DEFAULT 120,
ADD COLUMN     "statusApiRateLimitWindowSec" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "statusApiRequireToken" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "enabled" SET DEFAULT false;

-- AlterTable
ALTER TABLE "StatusPageAnnouncement" ADD COLUMN     "affectedServiceIds" JSONB;

-- AlterTable
ALTER TABLE "SystemSettings" DROP COLUMN "notifyOnAcknowledged",
DROP COLUMN "notifyOnResolved",
DROP COLUMN "notifyOnSnoozed",
DROP COLUMN "notifyOnSuppressed",
DROP COLUMN "notifyOnTriggered",
DROP COLUMN "notifyOnUnacknowledge",
DROP COLUMN "notifyOnUnsnooze",
DROP COLUMN "notifyOnUnsuppress",
DROP COLUMN "notifyOnUpdated",
ADD COLUMN     "encryptionKey" TEXT;

-- CreateTable
CREATE TABLE "StatusPageApiToken" (
    "id" TEXT NOT NULL,
    "statusPageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "StatusPageApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StatusPageApiToken_statusPageId_revokedAt_idx" ON "StatusPageApiToken"("statusPageId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StatusPageApiToken_tokenHash_key" ON "StatusPageApiToken"("tokenHash");

-- CreateIndex
CREATE INDEX "InAppNotification_userId_readAt_createdAt_idx" ON "InAppNotification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OidcConfig_id_key" ON "OidcConfig"("id");

-- AddForeignKey
ALTER TABLE "OidcConfig" ADD CONSTRAINT "OidcConfig_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusPageApiToken" ADD CONSTRAINT "StatusPageApiToken_statusPageId_fkey" FOREIGN KEY ("statusPageId") REFERENCES "StatusPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
