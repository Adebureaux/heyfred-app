import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { CampaignStatus, ScrapingJobStatus } from "@prisma/client";
import { Job } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service";
import { ApifyService } from "../apify.service";
import { DECISION_MAKER_SEARCH_QUEUE } from "../scraping.constants";

interface DecisionMakerSearchJobData {
  campaignId: string;
  scrapingJobId: string;
}

@Processor(DECISION_MAKER_SEARCH_QUEUE)
export class DecisionMakerSearchProcessor extends WorkerHost {
  private readonly logger = new Logger(DecisionMakerSearchProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apifyService: ApifyService,
  ) {
    super();
  }

  async process(job: Job<DecisionMakerSearchJobData>) {
    const { campaignId, scrapingJobId } = job.data;

    await this.prisma.scrapingJob.update({
      where: { id: scrapingJobId },
      data: { status: ScrapingJobStatus.RUNNING, startedAt: new Date() },
    });

    try {
      const campaign = await this.prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
      const companies = await this.prisma.company.findMany({ where: { campaignId } });

      const contacts = await this.apifyService.searchDecisionMakers({
        companies: companies.map((company) => ({
          id: company.id,
          name: company.name,
          linkedinUrl: company.linkedinUrl,
        })),
        jobTitles: campaign.targetJobTitles,
      });

      for (const contact of contacts) {
        await this.prisma.contact.create({
          data: {
            campaignId,
            companyId: contact.companyId,
            firstName: contact.firstName,
            lastName: contact.lastName,
            jobTitle: contact.jobTitle,
            linkedinUrl: contact.linkedinUrl,
            email: contact.email,
            location: contact.location,
            raw: contact.raw as any,
          },
        });
      }

      await this.prisma.scrapingJob.update({
        where: { id: scrapingJobId },
        data: {
          status: ScrapingJobStatus.SUCCEEDED,
          finishedAt: new Date(),
          resultCount: contacts.length,
        },
      });

      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.SCRAPED },
      });
    } catch (err) {
      this.logger.error(`Decision maker search failed for campaign ${campaignId}`, err);
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
