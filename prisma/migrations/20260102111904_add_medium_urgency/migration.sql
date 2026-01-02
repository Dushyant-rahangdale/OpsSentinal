/*
  Warnings:

  - You are about to drop the `WebVital` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "IncidentUrgency" ADD VALUE 'MEDIUM';

-- DropForeignKey
ALTER TABLE "WebVital" DROP CONSTRAINT "WebVital_userId_fkey";

-- DropTable
DROP TABLE "WebVital";
