-- CreateTable
CREATE TABLE "StatusServiceDailyHealth" (
    "serviceId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "operationalMs" BIGINT NOT NULL DEFAULT 0,
    "degradedMs" BIGINT NOT NULL DEFAULT 0,
    "maintenanceMs" BIGINT NOT NULL DEFAULT 0,
    "partialOutageMs" BIGINT NOT NULL DEFAULT 0,
    "majorOutageMs" BIGINT NOT NULL DEFAULT 0,
    "unknownMs" BIGINT NOT NULL DEFAULT 0,
    "incidentCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatusServiceDailyHealth_pkey" PRIMARY KEY ("serviceId","date")
);

-- CreateIndex
CREATE INDEX "StatusServiceDailyHealth_date_idx" ON "StatusServiceDailyHealth"("date");

-- AddForeignKey
ALTER TABLE "StatusServiceDailyHealth" ADD CONSTRAINT "StatusServiceDailyHealth_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
