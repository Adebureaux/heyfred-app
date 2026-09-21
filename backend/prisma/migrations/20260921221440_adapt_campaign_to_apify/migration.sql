/*
  Warnings:

  - You are about to drop the column `targetCompanySizeMax` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `targetCompanySizeMin` on the `Campaign` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "targetCompanySizeMax",
DROP COLUMN "targetCompanySizeMin";
