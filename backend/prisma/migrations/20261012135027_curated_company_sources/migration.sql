-- CreateEnum
CREATE TYPE "ProspectTargetType" AS ENUM ('B2B_COMPANIES', 'AGENCIES_FREELANCERS', 'LOCAL_BUSINESSES');

-- AlterEnum
BEGIN;
CREATE TYPE "ProspectListStatus_new" AS ENUM ('BRIEF_SET', 'SCRAPING', 'ENRICHING', 'READY', 'FAILED');
ALTER TABLE "ProspectList" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ProspectList" ALTER COLUMN "status" TYPE "ProspectListStatus_new" USING ("status"::text::"ProspectListStatus_new");
ALTER TYPE "ProspectListStatus" RENAME TO "ProspectListStatus_old";
ALTER TYPE "ProspectListStatus_new" RENAME TO "ProspectListStatus";
DROP TYPE "ProspectListStatus_old";
ALTER TABLE "ProspectList" ALTER COLUMN "status" SET DEFAULT 'BRIEF_SET';
COMMIT;

-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "ProspectList" ADD COLUMN     "targetType" "ProspectTargetType" NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'BRIEF_SET';

-- AlterTable
ALTER TABLE "ScrapedCompany" ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "ScrapingRun" DROP COLUMN "selectionReasoning";

