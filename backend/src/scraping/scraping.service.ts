import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { ProspectListStatus, ScrapingRunStage, ScrapingRunStatus } from "@prisma/client";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { COMPANY_SEARCH_QUEUE } from "./scraping.constants";

@Injectable()
export class ScrapingService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(COMPANY_SEARCH_QUEUE) private readonly companySearchQueue: Queue,
  ) {}

  async triggerForProspectList(prospectListId: string) {
    await this.prisma.prospect.deleteMany({ where: { prospectListId } });
    await this.prisma.scrapedCompany.deleteMany({ where: { prospectListId } });

    const companySearchRun = await this.prisma.scrapingRun.create({
      data: {
        prospectListId,
        stage: ScrapingRunStage.COMPANY_SEARCH,
        status: ScrapingRunStatus.QUEUED,
      },
    });
    const enrichmentRun = await this.prisma.scrapingRun.create({
      data: {
        prospectListId,
        stage: ScrapingRunStage.PROSPECT_ENRICHMENT,
        status: ScrapingRunStatus.QUEUED,
      },
    });

    await this.prisma.prospectList.update({
      where: { id: prospectListId },
      data: { status: ProspectListStatus.SCRAPING },
    });

    await this.companySearchQueue.add("run", {
      prospectListId,
      scrapingRunId: companySearchRun.id,
      nextScrapingRunId: enrichmentRun.id,
    });

    return this.listRunsForProspectList(prospectListId);
  }

  listRunsForProspectList(prospectListId: string) {
    return this.prisma.scrapingRun.findMany({
      where: { prospectListId },
      orderBy: { createdAt: "asc" },
    });
  }
}
