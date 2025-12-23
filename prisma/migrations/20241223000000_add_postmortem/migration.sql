-- CreateTable
CREATE TABLE "Postmortem" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "timeline" JSONB,
    "impact" JSONB,
    "rootCause" TEXT,
    "resolution" TEXT,
    "actionItems" JSONB,
    "lessons" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Postmortem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Postmortem_incidentId_key" ON "Postmortem"("incidentId");

-- CreateIndex
CREATE INDEX "Postmortem_incidentId_idx" ON "Postmortem"("incidentId");

-- CreateIndex
CREATE INDEX "Postmortem_status_createdAt_idx" ON "Postmortem"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Postmortem_createdById_idx" ON "Postmortem"("createdById");

-- AddForeignKey
ALTER TABLE "Postmortem" ADD CONSTRAINT "Postmortem_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postmortem" ADD CONSTRAINT "Postmortem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;





