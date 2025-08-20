/*
  Warnings:

  - You are about to drop the column `createdById` on the `Staff` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Staff" DROP CONSTRAINT "Staff_createdById_fkey";

-- AlterTable
ALTER TABLE "Staff" DROP COLUMN "createdById",
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "hasPwdChanged" BOOLEAN NOT NULL DEFAULT false;
