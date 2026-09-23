import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { ProspectListStatus, ScrapingRunStatus, UnipileAccountStatus } from "@prisma/client";
import { Job } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service";
import { UnipileProfileResult, UnipileService } from "../../unipile/unipile.service";
import { ENRICHMENT_CONCURRENCY, MAX_PROSPECTS_PER_COMPANY, PROSPECT_ENRICHMENT_QUEUE } from "../scraping.constants";

interface EnrichmentJobData {
  prospectListId: string;
  scrapingRunId: string;
}

function splitName(profile: UnipileProfileResult): { firstName: string; lastName: string } {
  if (profile.first_name || profile.last_name) {
    return { firstName: profile.first_name ?? "", lastName: profile.last_name ?? "" };
  }
  const [firstName, ...rest] = (profile.name ?? "").split(" ");
  return { firstName: firstName || "Unknown", lastName: rest.join(" ") };
}

@Processor(PROSPECT_ENRICHMENT_QUEUE)
export class ProspectEnrichmentProcessor extends WorkerHost {
  private readonly logger = new Logger(ProspectEnrichmentProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly unipileService: UnipileService,
  ) {
    super();
  }

  async process(job: Job<EnrichmentJobData>) {
    const { prospectListId, scrapingRunId } = job.data;

    await this.prisma.scrapingRun.update({
      where: { id: scrapingRunId },
      data: { status: ScrapingRunStatus.RUNNING, startedAt: new Date() },
    });

    try {
      const prospectList = await this.prisma.prospectList.findUniqueOrThrow({
        where: { id: prospectListId },
      });
      const unipileAccount = await this.prisma.unipileAccount.findUnique({
        where: { userId: prospectList.userId },
      });

      if (!unipileAccount || unipileAccount.status !== UnipileAccountStatus.CONNECTED) {
        throw new Error(
          "No connected LinkedIn account. Connect one from Settings before running a list.",
        );
      }

      const companies = await this.prisma.scrapedCompany.findMany({
        where: { prospectListId },
      });

      let totalProspects = 0;
      for (let i = 0; i < companies.length; i += ENRICHMENT_CONCURRENCY) {
        const batch = companies.slice(i, i + ENRICHMENT_CONCURRENCY);
        const batchCounts = await Promise.all(
          batch.map((company) =>
            this.enrichCompany(company, prospectList.targetJobTitles, unipileAccount.unipileAccountId ?? ""),
          ),
        );
        totalProspects += batchCounts.reduce((sum, count) => sum + count, 0);
      }

      await this.prisma.scrapingRun.update({
        where: { id: scrapingRunId },
        data: {
          status: ScrapingRunStatus.SUCCEEDED,
          finishedAt: new Date(),
          resultCount: totalProspects,
        },
      });

      await this.prisma.prospectList.update({
        where: { id: prospectListId },
        data: { status: ProspectListStatus.READY },
      });
    } catch (err) {
      this.logger.error(`Prospect enrichment failed for prospect list ${prospectListId}`, err);
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

  private async enrichCompany(
    company: { id: string; prospectListId: string; name: string; linkedinCompanyId: string | null },
    jobTitles: string[],
    accountId: string,
  ): Promise<number> {
    const companyId =
      company.linkedinCompanyId ??
      (await this.unipileService.resolveCompanyId(accountId, company.name));

    if (!companyId) {
      return 0;
    }

    if (!company.linkedinCompanyId) {
      await this.prisma.scrapedCompany.update({
        where: { id: company.id },
        data: { linkedinCompanyId: companyId },
      });
    }

    const profiles = await this.unipileService.searchDecisionMakers({
      accountId,
      companyId,
      jobTitles,
      limit: MAX_PROSPECTS_PER_COMPANY,
    });

    for (const profile of profiles) {
      const { firstName, lastName } = splitName(profile);
      await this.prisma.prospect.create({
        data: {
          prospectListId: company.prospectListId,
          companyId: company.id,
          firstName,
          lastName,
          jobTitle: profile.headline ?? "Unknown title",
          linkedinUrl: profile.profile_url ?? null,
          raw: profile as any,
        },
      });
    }

    return profiles.length;
  }
}
