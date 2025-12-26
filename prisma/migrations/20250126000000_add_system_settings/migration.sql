-- Add SystemSettings table for application-wide configuration
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "appUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- Insert default row (singleton pattern)
INSERT INTO "SystemSettings" ("id", "updatedAt") VALUES ('default', NOW());
