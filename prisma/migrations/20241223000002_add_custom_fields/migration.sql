-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'SELECT', 'BOOLEAN', 'URL', 'EMAIL');

-- CreateTable
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" "CustomFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT,
    "options" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "showInList" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldValue" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "customFieldId" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomField_key_key" ON "CustomField"("key");

-- CreateIndex
CREATE INDEX "CustomField_key_idx" ON "CustomField"("key");

-- CreateIndex
CREATE INDEX "CustomField_order_idx" ON "CustomField"("order");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldValue_incidentId_customFieldId_key" ON "CustomFieldValue"("incidentId", "customFieldId");

-- CreateIndex
CREATE INDEX "CustomFieldValue_incidentId_idx" ON "CustomFieldValue"("incidentId");

-- CreateIndex
CREATE INDEX "CustomFieldValue_customFieldId_idx" ON "CustomFieldValue"("customFieldId");

-- CreateIndex
CREATE INDEX "CustomFieldValue_value_idx" ON "CustomFieldValue"("value");

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_customFieldId_fkey" FOREIGN KEY ("customFieldId") REFERENCES "CustomField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

