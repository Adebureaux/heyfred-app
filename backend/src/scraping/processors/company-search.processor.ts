import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { ProspectListStatus, ScrapingRunStatus } from "@prisma/client";
import { Job, Queue } from "bullmq";
import { AiActorSelectionService } from "../../ai-actor-selection/ai-actor-selection.service";
import { PrismaService } from "../../prisma/prisma.service";
import { mapToScrapedCompany } from "../company-mapper";
import { ApifyRunnerService } from "../apify-runner.service";
import {
  COMPANY_SEARCH_QUEUE,
  MAX_COMPANIES_PER_RUN,
  PROSPECT_ENRICHMENT_QUEUE,
} from "../scraping.constants";

// Clamps whichever item-count field the actor's schema happens to use, regardless of what the
// AI generated, so a first real test can't accidentally run an unbounded/expensive search.
function clampItemLimit(input: Record<string, unknown>): Record<string, unknown> {
  const clamped = { ...input };
  for (const key of ["maxItems", "maxResults", "limit"]) {
    if (key in clamped) {
      clamped[key] = MAX_COMPANIES_PER_RUN;
    }
  }
  return clamped;
}

interface CompanySearchJobData {
  prospectListId: string;
  scrapingRunId: string;
  nextScrapingRunId: string;
}

@Processor(COMPANY_SEARCH_QUEUE)
export class CompanySearchProcessor extends WorkerHost {
  private readonly logger = new Logger(CompanySearchProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiActorSelection: AiActorSelectionService,
    private readonly apifyRunner: ApifyRunnerService,
    @InjectQueue(PROSPECT_ENRICHMENT_QUEUE) private readonly enrichmentQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<CompanySearchJobData>) {
    const { prospectListId, scrapingRunId, nextScrapingRunId } = job.data;

    await this.prisma.scrapingRun.update({
      where: { id: scrapingRunId },
      data: { status: ScrapingRunStatus.RUNNING, startedAt: new Date() },
    });

    try {
      const prospectList = await this.prisma.prospectList.findUniqueOrThrow({
        where: { id: prospectListId },
      });

      const { actorId, reasoning } = await this.aiActorSelection.selectActor(prospectList);

      // Persist the AI's choice immediately, before fetching its input schema or building the
      // input — so the decision is visible/auditable even if a later step fails.
      await this.prisma.scrapingRun.update({
        where: { id: scrapingRunId },
        data: { selectedActorId: actorId, selectionReasoning: reasoning },
      });

      const rawInput = await this.aiActorSelection.buildActorInput(actorId, prospectList);
      const input = clampItemLimit(rawInput);

      await this.prisma.scrapingRun.update({
        where: { id: scrapingRunId },
        data: { actorInput: input as any },
      });

      const rawItems = await this.apifyRunner.runActor(actorId, input);
      // Some actors return a "no results" marker object instead of an empty array when a
      // search matches nothing (seen in real testing: { found: false, message: "..." }) —
      // filter those out rather than persisting them as fake companies.
      const realItems = rawItems.filter((item) => item.found !== false);
      const companies = realItems.slice(0, MAX_COMPANIES_PER_RUN).map(mapToScrapedCompany);

      await this.prisma.scrapedCompany.createMany({
        data: companies.map((company) => ({
          prospectListId,
          name: company.name,
          domain: company.domain,
          linkedinUrl: company.linkedinUrl,
          raw: company.raw as any,
        })),
      });

      await this.prisma.scrapingRun.update({
        where: { id: scrapingRunId },
        data: {
          status: ScrapingRunStatus.SUCCEEDED,
          finishedAt: new Date(),
          resultCount: companies.length,
        },
      });

      await this.enrichmentQueue.add("run", {
        prospectListId,
        scrapingRunId: nextScrapingRunId,
      });
    } catch (err) {
      this.logger.error(`Company search failed for prospect list ${prospectListId}`, err);
      await this.prisma.scrapingRun.update({
        where: { id: scrapingRunId },
        data: {
          status: ScrapingRunStatus.FAILED,
          finishedAt: new Date(),
          error: err instanceof Error ? err.message : String(err),
        },
      });
      await this.prisma.prospectList.update({
        where: { id: prospectListId },
        data: { status: ProspectListStatus.FAILED },
      });
    }
  }
}
