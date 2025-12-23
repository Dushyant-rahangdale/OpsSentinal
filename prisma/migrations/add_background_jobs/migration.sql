-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('ESCALATION', 'NOTIFICATION', 'AUTO_UNSNOOZE', 'SCHEDULED_TASK');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "error" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackgroundJob_type_status_scheduledAt_idx" ON "BackgroundJob"("type", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "BackgroundJob_status_scheduledAt_idx" ON "BackgroundJob"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "BackgroundJob_scheduledAt_idx" ON "BackgroundJob"("scheduledAt");





