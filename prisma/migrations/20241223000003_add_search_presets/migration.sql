-- CreateTable
CREATE TABLE "SearchPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "filterCriteria" JSONB NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "sharedWithTeams" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchPresetUsage" (
    "id" TEXT NOT NULL,
    "presetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchPresetUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchPreset_createdById_idx" ON "SearchPreset"("createdById");

-- CreateIndex
CREATE INDEX "SearchPreset_isShared_isPublic_idx" ON "SearchPreset"("isShared", "isPublic");

-- CreateIndex
CREATE INDEX "SearchPreset_order_idx" ON "SearchPreset"("order");

-- CreateIndex
CREATE INDEX "SearchPreset_lastUsedAt_idx" ON "SearchPreset"("lastUsedAt");

-- CreateIndex
CREATE INDEX "SearchPresetUsage_presetId_idx" ON "SearchPresetUsage"("presetId");

-- CreateIndex
CREATE INDEX "SearchPresetUsage_userId_idx" ON "SearchPresetUsage"("userId");

-- CreateIndex
CREATE INDEX "SearchPresetUsage_usedAt_idx" ON "SearchPresetUsage"("usedAt");

-- AddForeignKey
ALTER TABLE "SearchPreset" ADD CONSTRAINT "SearchPreset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchPresetUsage" ADD CONSTRAINT "SearchPresetUsage_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "SearchPreset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchPresetUsage" ADD CONSTRAINT "SearchPresetUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;





