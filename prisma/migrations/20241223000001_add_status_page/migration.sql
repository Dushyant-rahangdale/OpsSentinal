-- CreateTable
CREATE TABLE "StatusPage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Status Page',
    "subdomain" TEXT,
    "customDomain" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "showServices" BOOLEAN NOT NULL DEFAULT true,
    "showIncidents" BOOLEAN NOT NULL DEFAULT true,
    "showMetrics" BOOLEAN NOT NULL DEFAULT true,
    "branding" JSONB,
    "footerText" TEXT,
    "contactEmail" TEXT,
    "contactUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatusPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusPageService" (
    "id" TEXT NOT NULL,
    "statusPageId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "displayName" TEXT,
    "showOnPage" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusPageService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusPageAnnouncement" (
    "id" TEXT NOT NULL,
    "statusPageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "incidentId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatusPageAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StatusPage_subdomain_key" ON "StatusPage"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "StatusPage_customDomain_key" ON "StatusPage"("customDomain");

-- CreateIndex
CREATE INDEX "StatusPage_enabled_idx" ON "StatusPage"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "StatusPageService_statusPageId_serviceId_key" ON "StatusPageService"("statusPageId", "serviceId");

-- CreateIndex
CREATE INDEX "StatusPageService_statusPageId_order_idx" ON "StatusPageService"("statusPageId", "order");

-- CreateIndex
CREATE INDEX "StatusPageAnnouncement_statusPageId_isActive_startDate_idx" ON "StatusPageAnnouncement"("statusPageId", "isActive", "startDate");

-- CreateIndex
CREATE INDEX "StatusPageAnnouncement_incidentId_idx" ON "StatusPageAnnouncement"("incidentId");

-- AddForeignKey
ALTER TABLE "StatusPageService" ADD CONSTRAINT "StatusPageService_statusPageId_fkey" FOREIGN KEY ("statusPageId") REFERENCES "StatusPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusPageService" ADD CONSTRAINT "StatusPageService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusPageAnnouncement" ADD CONSTRAINT "StatusPageAnnouncement_statusPageId_fkey" FOREIGN KEY ("statusPageId") REFERENCES "StatusPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusPageAnnouncement" ADD CONSTRAINT "StatusPageAnnouncement_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;





