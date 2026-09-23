-- CreateEnum
CREATE TYPE "ProspectListStatus" AS ENUM ('DRAFT', 'BRIEF_SET', 'SCRAPING', 'ENRICHING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ScrapingRunStage" AS ENUM ('COMPANY_SEARCH', 'PROSPECT_ENRICHMENT');

-- CreateEnum
CREATE TYPE "ScrapingRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProspectStatus" AS ENUM ('PENDING', 'MESSAGE_SENT', 'REPLIED', 'INTERESTED', 'MEETING_BOOKED', 'NOT_INTERESTED', 'FAILED');

-- CreateEnum
CREATE TYPE "UnipileAccountStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateTable
CREATE TABLE "UnipileAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "unipileAccountId" TEXT,
    "status" "UnipileAccountStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnipileAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProspectListStatus" NOT NULL DEFAULT 'DRAFT',
    "offerDescription" TEXT NOT NULL,
    "valueProposition" TEXT,
    "targetIndustries" TEXT[],
    "targetCompanySizeMin" INTEGER,
    "targetCompanySizeMax" INTEGER,
    "targetLocations" TEXT[],
    "targetJobTitles" TEXT[],
    "additionalCriteria" TEXT,
    "exclusions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapingRun" (
    "id" TEXT NOT NULL,
    "prospectListId" TEXT NOT NULL,
    "stage" "ScrapingRunStage" NOT NULL,
    "status" "ScrapingRunStatus" NOT NULL DEFAULT 'QUEUED',
    "selectedActorId" TEXT,
    "selectionReasoning" TEXT,
    "actorInput" JSONB,
    "resultCount" INTEGER,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapingRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapedCompany" (
    "id" TEXT NOT NULL,
    "prospectListId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "linkedinCompanyId" TEXT,
    "linkedinUrl" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapedCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "prospectListId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "linkedinUrl" TEXT,
    "email" TEXT,
    "raw" JSONB,
    "status" "ProspectStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UnipileAccount_userId_key" ON "UnipileAccount"("userId");

-- CreateIndex
CREATE INDEX "ProspectList_userId_idx" ON "ProspectList"("userId");

-- CreateIndex
CREATE INDEX "ScrapingRun_prospectListId_idx" ON "ScrapingRun"("prospectListId");

-- CreateIndex
CREATE INDEX "ScrapedCompany_prospectListId_idx" ON "ScrapedCompany"("prospectListId");

-- CreateIndex
CREATE INDEX "Prospect_prospectListId_idx" ON "Prospect"("prospectListId");

-- AddForeignKey
ALTER TABLE "UnipileAccount" ADD CONSTRAINT "UnipileAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectList" ADD CONSTRAINT "ProspectList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapingRun" ADD CONSTRAINT "ScrapingRun_prospectListId_fkey" FOREIGN KEY ("prospectListId") REFERENCES "ProspectList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapedCompany" ADD CONSTRAINT "ScrapedCompany_prospectListId_fkey" FOREIGN KEY ("prospectListId") REFERENCES "ProspectList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_prospectListId_fkey" FOREIGN KEY ("prospectListId") REFERENCES "ProspectList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "ScrapedCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
