-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT_TARGETING', 'TARGETING_SET', 'SCRAPING', 'SCRAPED', 'DRAFT_MESSAGING', 'READY', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'TARGETING_SET',
    "targetLocation" TEXT NOT NULL,
    "targetSector" TEXT NOT NULL,
    "targetJobTitles" TEXT[],
    "targetCompanySizeMin" INTEGER,
    "targetCompanySizeMax" INTEGER,
    "targetKeywords" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Campaign_userId_idx" ON "Campaign"("userId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
