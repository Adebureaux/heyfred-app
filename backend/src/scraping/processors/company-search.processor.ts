import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { CampaignStatus, ScrapingJobStatus } from "@prisma/client";
import { Job, Queue } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service";
import { ApifyService } from "../apify.service";
import { COMPANY_SEARCH_QUEUE, DECISION_MAKER_SEARCH_QUEUE } from "../scraping.constants";

interface CompanySearchJobData {
  campaignId: string;
  scrapingJobId: string;
  nextScrapingJobId: string;
}

@Processor(COMPANY_SEARCH_QUEUE)
export class CompanySearchProcessor extends WorkerHost {
  private readonly logger = new Logger(CompanySearchProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apifyService: ApifyService,
    @InjectQueue(DECISION_MAKER_SEARCH_QUEUE) private readonly decisionMakerQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<CompanySearchJobData>) {
    const { campaignId, scrapingJobId, nextScrapingJobId } = job.data;

    await this.prisma.scrapingJob.update({
      where: { id: scrapingJobId },
      data: { status: ScrapingJobStatus.RUNNING, startedAt: new Date() },
    });

    try {
      const campaign = await this.prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });

      const companies = await this.apifyService.searchCompanies({
        location: campaign.targetLocation,
        industryId: campaign.targetIndustryId,
        keywords: campaign.targetKeywords ?? undefined,
      });

      await this.prisma.company.createMany({
        data: companies.map((company) => ({
          campaignId,
          name: company.name,
          domain: company.domain,
          sector: company.sector,
          size: company.size,
          location: company.location,
          linkedinUrl: company.linkedinUrl,
          raw: company.raw as any,
        })),
      });

      await this.prisma.scrapingJob.update({
        where: { id: scrapingJobId },
        data: {
          status: ScrapingJobStatus.SUCCEEDED,
          finishedAt: new Date(),
          resultCount: companies.length,
        },
      });

      await this.decisionMakerQueue.add("run", {
        campaignId,
        scrapingJobId: nextScrapingJobId,
      });
    } catch (err) {
      this.logger.error(`Company search failed for campaign ${campaignId}`, err);
      await this.prisma.scrapingJob.update({
        where: { id: scrapingJobId },
        data: {
          status: ScrapingJobStatus.FAILED,
          finishedAt: new Date(),
          error: err instanceof Error ? err.message : String(err),
        },
      });
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.FAILED },
      });
    }
  }
}
