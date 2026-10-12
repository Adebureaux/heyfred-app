import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import {
  FitVerdict,
  ProspectList,
  ProspectListStatus,
  ProspectTargetType,
  ScrapedCompany,
  ScrapingRunStatus,
  UnipileAccountStatus,
} from "@prisma/client";
import { Job } from "bullmq";
import { nonEmptyString } from "../../company-sources/company-source";
import { CompanySourcesService } from "../../company-sources/company-sources.service";
import { PrismaService } from "../../prisma/prisma.service";
import { Fit, ProspectQualifierService } from "../../qualification/prospect-qualifier.service";
import { UnipileProfileResult, UnipileService } from "../../unipile/unipile.service";
import { ABSOLUTE_MAX_PROSPECTS_PER_COMPANY, PROSPECT_ENRICHMENT_QUEUE } from "../scraping.constants";

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

// LinkedIn's title search is literal, so a brief targeting "Founder" misses a small company's
// "CEO" (confirmed by real testing, 2026-09-24). For the top decision-maker of a small company
// these titles are interchangeable, so the queries are widened with them; whether each person
// found really fits is then decided by the qualifier.
const FOUNDER_SYNONYMS = ["founder", "ceo", "owner"];

function expandTitleSynonyms(targetTitles: string[]): string[] {
  const targetsFounderRole = targetTitles.some((title) =>
    FOUNDER_SYNONYMS.some((synonym) => title.toLowerCase().includes(synonym)),
  );
  return targetsFounderRole ? Array.from(new Set([...targetTitles, ...FOUNDER_SYNONYMS])) : targetTitles;
}

// Confirmed by real testing (2026-09-24): a company source can return a solo freelancer as a
// "company" — their LinkedIn URL is a personal profile (/in/...), not a company page. They
// already are the decision-maker, so they're promoted straight to a prospect.
const PERSONAL_PROFILE_PATTERN = /linkedin\.com\/in\//i;

function isPersonalProfileUrl(linkedinUrl: string | null): boolean {
  return !!linkedinUrl && PERSONAL_PROFILE_PATTERN.test(linkedinUrl);
}

// Bounds how many individual per-title Unipile calls one company can trigger (titles are tried
// in order — the brief's own titles first, then synonyms — stopping once enough candidates are
// collected), so a long title list can't fan out into unbounded LinkedIn searches.
const MAX_TITLE_QUERIES_PER_COMPANY = 6;

// Candidates collected per prospect wanted: LinkedIn's title search is fuzzy, and the qualifier
// discards the people who don't actually fit, so it needs a few to choose from.
const CANDIDATE_OVERSAMPLING = 3;

const FIT_RANK: Record<FitVerdict, number> = {
  [FitVerdict.MATCH]: 0,
  [FitVerdict.PARTIAL]: 1,
  [FitVerdict.MISMATCH]: 2,
};

interface DecisionMakerSearch {
  list: ProspectList;
  accountId: string;
  jobTitles: string[];
  limit: number;
  locationId: string | null;
  // Agency listings carry a direct contact (often the founder's own email), worth keeping when
  // no named decision-maker is found on LinkedIn; a B2B brief needs a named person.
  fallBackToCompany: boolean;
}

type PromotedKind = "freelancer" | "agency" | "establishment";

const DEFAULT_PROMOTED_TITLES: Record<PromotedKind, string> = {
  freelancer: "Freelance",
  agency: "Agence",
  establishment: "Établissement",
};

@Processor(PROSPECT_ENRICHMENT_QUEUE)
export class ProspectEnrichmentProcessor extends WorkerHost {
  private readonly logger = new Logger(ProspectEnrichmentProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly unipileService: UnipileService,
    private readonly qualifier: ProspectQualifierService,
    private readonly companySources: CompanySourcesService,
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
      // Only companies the qualifier kept, best fits first.
      const companies = await this.prisma.scrapedCompany.findMany({
        where: { prospectListId, fitVerdict: { in: [FitVerdict.MATCH, FitVerdict.PARTIAL] } },
        orderBy: { fitVerdict: "asc" },
      });

      const totalProspects =
        prospectList.targetType === ProspectTargetType.LOCAL_BUSINESSES
          ? await this.promoteEstablishments(companies, prospectList.maxProspects)
          : await this.findDecisionMakers(prospectList, companies);

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

  // A local business's owner is rarely findable on LinkedIn, so the establishment itself is the
  // prospect — the company source already carries its phone, email and website.
  private async promoteEstablishments(companies: ScrapedCompany[], maxProspects: number): Promise<number> {
    const selected = companies.slice(0, maxProspects);
    for (const company of selected) {
      await this.promoteCompany(company, "establishment");
    }
    return selected.length;
  }

  private async findDecisionMakers(list: ProspectList, companies: ScrapedCompany[]): Promise<number> {
    const unipileAccount = await this.prisma.unipileAccount.findUnique({
      where: { userId: list.userId },
    });
    if (!unipileAccount || unipileAccount.status !== UnipileAccountStatus.CONNECTED) {
      throw new Error("No connected LinkedIn account. Connect one from Settings before running a list.");
    }

    const accountId = unipileAccount.unipileAccountId ?? "";
    const locationName = list.targetLocations[0];
    // Resolved once per run (not per company) since it's the same target location throughout.
    const locationId = locationName ? await this.unipileService.resolveLocationId(accountId, locationName) : null;
    const jobTitles = expandTitleSynonyms(list.targetJobTitles);
    const fallBackToCompany = list.targetType === ProspectTargetType.AGENCIES_FREELANCERS;
    const perCompany = this.companySources.forTargetType(list.targetType).prospectsPerCompany;

    // One company at a time, best fits first, stopping as soon as the budget is met: LinkedIn
    // calls are serialized anyway (see UnipileService), and going in order means companies that
    // won't be needed are never searched.
    let totalProspects = 0;
    for (const company of companies) {
      const remaining = list.maxProspects - totalProspects;
      if (remaining <= 0) break;
      const limit = Math.min(perCompany, remaining);
      totalProspects += await this.enrichCompany(company, {
        list,
        accountId,
        jobTitles,
        limit,
        locationId,
        fallBackToCompany,
      });
    }
    return totalProspects;
  }

  private async enrichCompany(company: ScrapedCompany, search: DecisionMakerSearch): Promise<number> {
    if (isPersonalProfileUrl(company.linkedinUrl)) {
      return this.promoteCompany(company, "freelancer");
    }

    const people = await this.findQualifiedPeople(company, search);
    if (people.length === 0) {
      return search.fallBackToCompany && (company.email || company.phone)
        ? this.promoteCompany(company, "agency", {
            verdict: FitVerdict.PARTIAL,
            reason: "Contact direct de l'agence : aucun décideur identifié sur LinkedIn.",
          })
        : 0;
    }

    for (const { profile, fit } of people) {
      const { firstName, lastName } = splitName(profile);
      await this.prisma.prospect.create({
        data: {
          prospectListId: company.prospectListId,
          companyId: company.id,
          firstName,
          lastName,
          jobTitle: profile.headline ?? "Unknown title",
          linkedinUrl: profile.profile_url ?? null,
          fitVerdict: fit.verdict,
          fitReason: fit.reason,
          raw: profile as any,
        },
      });
    }
    return people.length;
  }

  private async findQualifiedPeople(
    company: ScrapedCompany,
    search: DecisionMakerSearch,
  ): Promise<{ profile: UnipileProfileResult; fit: Fit }[]> {
    // Only companies known to be on LinkedIn are searched: resolving a name with no LinkedIn
    // page behind it would just latch onto an unrelated company with a similar name.
    if (!company.linkedinCompanyId && !company.linkedinUrl) {
      return [];
    }
    const companyId =
      company.linkedinCompanyId ?? (await this.unipileService.resolveCompanyId(search.accountId, company.name));
    if (!companyId) {
      return [];
    }
    if (!company.linkedinCompanyId) {
      await this.prisma.scrapedCompany.update({
        where: { id: company.id },
        data: { linkedinCompanyId: companyId },
      });
    }

    let candidates = await this.collectCandidates(companyId, search, true);
    // Confirmed by real testing (2026-09-24): a French company's own CEO listed his personal
    // LinkedIn location as "Munich" — self-reported locations are unreliable, so when the
    // location-filtered search finds nobody, search again without it and let the qualifier
    // weigh where each person is based.
    if (candidates.length === 0 && search.locationId) {
      candidates = await this.collectCandidates(companyId, search, false);
    }

    const fits = await this.qualifier.qualifyPeople(
      search.list,
      company,
      candidates.map((profile) => ({
        name: profile.name ?? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
        headline: profile.headline ?? "",
        location: typeof profile.location === "string" ? profile.location : null,
      })),
    );
    return candidates
      .map((profile, i) => ({ profile, fit: fits[i] }))
      .filter(({ fit }) => fit.verdict !== FitVerdict.MISMATCH)
      .sort((a, b) => FIT_RANK[a.fit.verdict] - FIT_RANK[b.fit.verdict])
      .slice(0, search.limit);
  }

  // A single combined query can't express "any of these titles" (see the note on
  // searchDecisionMakers), so each title is searched on its own and results are merged.
  private async collectCandidates(
    companyId: string,
    { accountId, jobTitles, limit, locationId }: DecisionMakerSearch,
    withLocation: boolean,
  ): Promise<UnipileProfileResult[]> {
    const target = limit * CANDIDATE_OVERSAMPLING;
    const seen = new Set<string>();
    const candidates: UnipileProfileResult[] = [];
    for (const jobTitle of jobTitles.slice(0, MAX_TITLE_QUERIES_PER_COMPANY)) {
      if (candidates.length >= target) break;
      const profiles = await this.unipileService.searchDecisionMakers({
        accountId,
        companyId,
        jobTitle,
        locationId: withLocation ? locationId : null,
        limit: Math.min(target, ABSOLUTE_MAX_PROSPECTS_PER_COMPANY),
      });
      for (const profile of profiles) {
        const key = profile.public_identifier ?? profile.profile_url ?? JSON.stringify(profile);
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push(profile);
      }
    }
    return candidates.slice(0, target);
  }

  // The company record itself becomes the prospect: a freelancer listed under their own name, an
  // agency with no named decision-maker found, or a local establishment.
  private async promoteCompany(company: ScrapedCompany, kind: PromotedKind, fit?: Fit): Promise<number> {
    const raw = (company.raw ?? {}) as Record<string, unknown>;
    const description =
      nonEmptyString(raw.tagline) ??
      nonEmptyString(raw.categoryName) ??
      nonEmptyString(raw.description)?.slice(0, 200) ??
      DEFAULT_PROMOTED_TITLES[kind];
    const [firstName, ...rest] = kind === "freelancer" ? company.name.split(" ") : [company.name];

    await this.prisma.prospect.create({
      data: {
        prospectListId: company.prospectListId,
        companyId: company.id,
        firstName,
        lastName: rest.join(" "),
        jobTitle: description,
        linkedinUrl: company.linkedinUrl,
        email: company.email,
        phone: company.phone,
        fitVerdict: fit?.verdict ?? company.fitVerdict,
        fitReason: fit?.reason ?? company.fitReason,
        raw: raw as any,
      },
    });
    return 1;
  }
}
