/*
  Warnings:

  - You are about to drop the `Campaign` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Company` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Contact` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ScrapingJob` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Campaign" DROP CONSTRAINT "Campaign_userId_fkey";

-- DropForeignKey
ALTER TABLE "Company" DROP CONSTRAINT "Company_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_companyId_fkey";

-- DropForeignKey
ALTER TABLE "ScrapingJob" DROP CONSTRAINT "ScrapingJob_campaignId_fkey";

-- DropTable
DROP TABLE "Campaign";

-- DropTable
DROP TABLE "Company";

-- DropTable
DROP TABLE "Contact";

-- DropTable
DROP TABLE "ScrapingJob";

-- DropEnum
DROP TYPE "CampaignContactStatus";

-- DropEnum
DROP TYPE "CampaignStatus";

-- DropEnum
DROP TYPE "ScrapingJobStage";

-- DropEnum
DROP TYPE "ScrapingJobStatus";
