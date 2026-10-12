-- CreateEnum
CREATE TYPE "FitVerdict" AS ENUM ('MATCH', 'PARTIAL', 'MISMATCH');

-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN     "fitReason" TEXT,
ADD COLUMN     "fitVerdict" "FitVerdict";

-- AlterTable
ALTER TABLE "ScrapedCompany" ADD COLUMN     "fitReason" TEXT,
ADD COLUMN     "fitVerdict" "FitVerdict";

