/*
  Warnings:

  - You are about to drop the column `layers` on the `OnCallSchedule` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OnCallSchedule" DROP COLUMN "layers";

-- CreateTable
CREATE TABLE "OnCallLayer" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3),
    "rotationLengthHours" INTEGER NOT NULL DEFAULT 24,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnCallLayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnCallLayerUser" (
    "id" TEXT NOT NULL,
    "layerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OnCallLayerUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnCallOverride" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "replacesUserId" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnCallOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnCallLayerUser_layerId_userId_key" ON "OnCallLayerUser"("layerId", "userId");

-- AddForeignKey
ALTER TABLE "OnCallLayer" ADD CONSTRAINT "OnCallLayer_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "OnCallSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnCallLayerUser" ADD CONSTRAINT "OnCallLayerUser_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "OnCallLayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnCallLayerUser" ADD CONSTRAINT "OnCallLayerUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnCallOverride" ADD CONSTRAINT "OnCallOverride_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "OnCallSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnCallOverride" ADD CONSTRAINT "OnCallOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnCallOverride" ADD CONSTRAINT "OnCallOverride_replacesUserId_fkey" FOREIGN KEY ("replacesUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
