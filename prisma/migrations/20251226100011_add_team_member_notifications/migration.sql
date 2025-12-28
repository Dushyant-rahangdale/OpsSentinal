-- AlterTable
-- ALTER TABLE "EscalationRule" ADD COLUMN     "notificationChannels" "NotificationChannel"[];

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "teamId" TEXT;

-- AlterTable
ALTER TABLE "StatusPage" ADD COLUMN     "emailProvider" TEXT,
ADD COLUMN     "organizationName" TEXT,
ADD COLUMN     "uptimeExcellentThreshold" DOUBLE PRECISION NOT NULL DEFAULT 99.9,
ADD COLUMN     "uptimeGoodThreshold" DOUBLE PRECISION NOT NULL DEFAULT 99.0;

-- AlterTable
ALTER TABLE "SystemSettings" ALTER COLUMN "id" SET DEFAULT 'default';

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "receiveTeamNotifications" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Incident_teamId_status_idx" ON "Incident"("teamId", "status");

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
