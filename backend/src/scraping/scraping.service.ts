import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { CampaignStatus, ScrapingJobStage, ScrapingJobStatus } from "@prisma/client";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { COMPANY_SEARCH_QUEUE } from "./scraping.constants";

@Injectable()
export class ScrapingService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(COMPANY_SEARCH_QUEUE) private readonly companySearchQueue: Queue,
  ) {}

  async triggerForCampaign(campaignId: string) {
    await this.prisma.contact.deleteMany({ where: { campaignId } });
    await this.prisma.company.deleteMany({ where: { campaignId } });

    const companyJob = await this.prisma.scrapingJob.create({
      data: { campaignId, stage: ScrapingJobStage.COMPANY_SEARCH, status: ScrapingJobStatus.QUEUED },
    });
    const decisionMakerJob = await this.prisma.scrapingJob.create({
      data: {
        campaignId,
        stage: ScrapingJobStage.DECISION_MAKER_SEARCH,
        status: ScrapingJobStatus.QUEUED,
      },
    });

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.SCRAPING },
    });

    await this.companySearchQueue.add("run", {
      campaignId,
      scrapingJobId: companyJob.id,
      nextScrapingJobId: decisionMakerJob.id,
    });

    return this.listJobsForCampaign(campaignId);
  }

  listJobsForCampaign(campaignId: string) {
    return this.prisma.scrapingJob.findMany({
      where: { campaignId },
      orderBy: { createdAt: "asc" },
    });
  }

  listContactsForCampaign(campaignId: string) {
    return this.prisma.contact.findMany({
      where: { campaignId },
      include: { company: true },
      orderBy: { createdAt: "desc" },
    });
  }
}
