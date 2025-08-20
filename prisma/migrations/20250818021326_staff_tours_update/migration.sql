/*
  Warnings:

  - You are about to drop the `_StaffToTour` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_StaffToTour" DROP CONSTRAINT "_StaffToTour_A_fkey";

-- DropForeignKey
ALTER TABLE "_StaffToTour" DROP CONSTRAINT "_StaffToTour_B_fkey";

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "tours" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Tour" ADD COLUMN     "guides" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropTable
DROP TABLE "_StaffToTour";
