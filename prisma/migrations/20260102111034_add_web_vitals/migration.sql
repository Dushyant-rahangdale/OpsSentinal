-- CreateTable
CREATE TABLE "SystemConfig" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SLADefinition" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Standard SLA',
    "version" INTEGER NOT NULL DEFAULT 1,
    "target" DOUBLE PRECISION NOT NULL DEFAULT 99.9,
    "window" TEXT NOT NULL DEFAULT '30d',
    "metricType" TEXT NOT NULL DEFAULT 'UPTIME',
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeTo" TIMESTAMP(3),

    CONSTRAINT "SLADefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SLASnapshot" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "slaDefinitionId" TEXT NOT NULL,
    "totalEvents" INTEGER NOT NULL DEFAULT 0,
    "errorEvents" INTEGER NOT NULL DEFAULT 0,
    "uptimePercentage" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "breachCount" INTEGER NOT NULL DEFAULT 0,
    "errorBudgetBurn" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "metadata" JSONB,

    CONSTRAINT "SLASnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricRollup" (
    "id" TEXT NOT NULL,
    "bucket" TIMESTAMP(3) NOT NULL,
    "serviceId" TEXT,
    "name" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "count" INTEGER NOT NULL,
    "sum" DOUBLE PRECISION NOT NULL,
    "min" DOUBLE PRECISION NOT NULL,
    "max" DOUBLE PRECISION NOT NULL,
    "p50" DOUBLE PRECISION,
    "p90" DOUBLE PRECISION,
    "p95" DOUBLE PRECISION,
    "p99" DOUBLE PRECISION,

    CONSTRAINT "MetricRollup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogEntry" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serviceId" TEXT,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "traceId" TEXT,
    "userId" TEXT,

    CONSTRAINT "LogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebVital" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "rating" TEXT NOT NULL,
    "navigationType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "userId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebVital_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SLADefinition_serviceId_idx" ON "SLADefinition"("serviceId");

-- CreateIndex
CREATE INDEX "SLASnapshot_date_idx" ON "SLASnapshot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SLASnapshot_date_slaDefinitionId_key" ON "SLASnapshot"("date", "slaDefinitionId");

-- CreateIndex
CREATE INDEX "MetricRollup_name_bucket_idx" ON "MetricRollup"("name", "bucket");

-- CreateIndex
CREATE INDEX "MetricRollup_bucket_idx" ON "MetricRollup"("bucket");

-- CreateIndex
CREATE INDEX "LogEntry_serviceId_timestamp_idx" ON "LogEntry"("serviceId", "timestamp");

-- CreateIndex
CREATE INDEX "LogEntry_timestamp_idx" ON "LogEntry"("timestamp");

-- CreateIndex
CREATE INDEX "LogEntry_traceId_idx" ON "LogEntry"("traceId");

-- CreateIndex
CREATE INDEX "WebVital_name_timestamp_idx" ON "WebVital"("name", "timestamp");

-- CreateIndex
CREATE INDEX "WebVital_url_idx" ON "WebVital"("url");

-- CreateIndex
CREATE INDEX "WebVital_timestamp_idx" ON "WebVital"("timestamp");

-- AddForeignKey
ALTER TABLE "SLADefinition" ADD CONSTRAINT "SLADefinition_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SLASnapshot" ADD CONSTRAINT "SLASnapshot_slaDefinitionId_fkey" FOREIGN KEY ("slaDefinitionId") REFERENCES "SLADefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebVital" ADD CONSTRAINT "WebVital_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
