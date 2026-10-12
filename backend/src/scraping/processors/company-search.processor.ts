import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { FitVerdict, ProspectListStatus, ScrapingRunStatus } from "@prisma/client";
import { Job, Queue } from "bullmq";
import { CompanySourcesService } from "../../company-sources/company-sources.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ProspectQualifierService } from "../../qualification/prospect-qualifier.service";
import { ApifyRunnerService } from "../apify-runner.service";
import { companyPoolSize, COMPANY_SEARCH_QUEUE, PROSPECT_ENRICHMENT_QUEUE } from "../scraping.constants";

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
    private readonly companySources: CompanySourcesService,
    private readonly qualifier: ProspectQualifierService,
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
      const source = this.companySources.forTargetType(prospectList.targetType);
      const poolSize = companyPoolSize(prospectList.maxProspects, source.prospectsPerCompany);
      const input = await source.buildInput(prospectList, poolSize);

      // Persisted before the paid call, so the exact query is visible even if the run fails.
      await this.prisma.scrapingRun.update({
        where: { id: scrapingRunId },
        data: { selectedActorId: source.actorId, actorInput: input as any },
      });

      const items = await this.apifyRunner.runActor(source.actorId, input);
      const companies = source.toCompanies(items).slice(0, poolSize);
      const fits = await this.qualifier.qualifyCompanies(prospectList, companies);

      // Rejected companies are kept too, with the reason, so the selection stays explainable;
      // only the others go on to the decision-maker search.
      await this.prisma.scrapedCompany.createMany({
        data: companies.map((company, i) => ({
          prospectListId,
          name: company.name,
          domain: company.domain,
          linkedinUrl: company.linkedinUrl,
          linkedinCompanyId: company.linkedinCompanyId,
          email: company.email,
          phone: company.phone,
          fitVerdict: fits[i].verdict,
          fitReason: fits[i].reason,
          raw: company.raw as any,
        })),
      });

      await this.prisma.scrapingRun.update({
        where: { id: scrapingRunId },
        data: {
          status: ScrapingRunStatus.SUCCEEDED,
          finishedAt: new Date(),
          resultCount: fits.filter((fit) => fit.verdict !== FitVerdict.MISMATCH).length,
        },
      });
      await this.prisma.prospectList.update({
        where: { id: prospectListId },
        data: { status: ProspectListStatus.ENRICHING },
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
