import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { COMPANY_SEARCH_ACTOR, DECISION_MAKER_SEARCH_ACTOR } from "./scraping.constants";

const MAX_COMPANIES_PER_CAMPAIGN = 1;
const MAX_CONTACTS_PER_COMPANY = 1;
const DECISION_MAKER_SEARCH_CONCURRENCY = 5;

interface CompanySearchParams {
  location: string;
  industryId: string;
  keywords?: string;
}

interface ScrapedCompany {
  name: string;
  domain: string | null;
  sector: string | null;
  size: string | null;
  location: string | null;
  linkedinUrl: string | null;
  raw: unknown;
}

interface DecisionMakerSearchParams {
  companies: { id: string; name: string; linkedinUrl?: string | null }[];
  jobTitles: string[];
}

interface ScrapedContact {
  companyId: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  linkedinUrl: string | null;
  email: string | null;
  location: string | null;
  raw: unknown;
}

// Dataset item shapes per https://apify.com/harvestapi/linkedin-company-search
// and https://apify.com/harvestapi/linkedin-profile-search (Full mode).
interface HarvestCompanyItem {
  name: string;
  linkedinUrl: string;
  website: string | null;
  industries?: { id: string; name: string }[];
  employeeCount?: number;
  locations?: { city?: string; country?: string; description?: string }[];
}

interface HarvestProfileItem {
  firstName: string;
  lastName: string;
  headline?: string;
  linkedinUrl: string;
  email?: string | null;
  location?: { linkedinText?: string };
}

// Real dataset items captured from an actual Apify run during testing, reused as
// fixtures while the paid runActor() call is disabled below.
const FIXTURE_COMPANY_ITEM: HarvestCompanyItem = {
  name: "eTwaz",
  linkedinUrl: "https://www.linkedin.com/company/etwaz-fr/",
  website: "https://www.etwaz.com/",
  industries: [{ id: "50", name: "Architecture and Planning" }],
  employeeCount: 1,
  locations: [{ city: "La Teste-de-Buch", country: "FR" }],
};

const FIXTURE_PROFILE_ITEM: HarvestProfileItem = {
  firstName: "David",
  lastName: "Schawk",
  headline: "CEO at Schawk",
  linkedinUrl: "https://www.linkedin.com/in/david-schawk-ba33863b",
};

@Injectable()
export class ApifyService {
  constructor(private readonly config: ConfigService) {}

  private get token(): string | undefined {
    return this.config.get<string>("APIFY_API_TOKEN") || undefined;
  }

  async searchCompanies(params: CompanySearchParams): Promise<ScrapedCompany[]> {
    // const items = await this.runActor<HarvestCompanyItem>(COMPANY_SEARCH_ACTOR, {
    //   scraperMode: "full",
    //   searchQuery: params.keywords,
    //   locations: [params.location],
    //   industryIds: [params.industryId],
    //   maxItems: MAX_COMPANIES_PER_CAMPAIGN,
    // });
    const items: HarvestCompanyItem[] = [FIXTURE_COMPANY_ITEM];

    return items.map((item) => {
      const primaryLocation = item.locations?.[0];
      return {
        name: item.name,
        domain: item.website ? item.website.replace(/^https?:\/\//, "").replace(/\/$/, "") : null,
        sector: item.industries?.[0]?.name ?? null,
        size: item.employeeCount != null ? String(item.employeeCount) : null,
        location: primaryLocation
          ? [primaryLocation.city, primaryLocation.country].filter(Boolean).join(", ")
          : null,
        linkedinUrl: item.linkedinUrl,
        raw: item,
      };
    });
  }

  async searchDecisionMakers(params: DecisionMakerSearchParams): Promise<ScrapedContact[]> {
    const results: ScrapedContact[] = [];
    for (let i = 0; i < params.companies.length; i += DECISION_MAKER_SEARCH_CONCURRENCY) {
      const batch = params.companies.slice(i, i + DECISION_MAKER_SEARCH_CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map((company) => this.searchDecisionMakersForCompany(company, params.jobTitles)),
      );
      results.push(...batchResults.flat());
    }

    return results;
  }

  private async searchDecisionMakersForCompany(
    company: { id: string; name: string; linkedinUrl?: string | null },
    jobTitles: string[],
  ): Promise<ScrapedContact[]> {
    // const items = await this.runActor<HarvestProfileItem>(DECISION_MAKER_SEARCH_ACTOR, {
    //   profileScraperMode: "Full",
    //   currentJobTitles: jobTitles,
    //   currentCompanies: company.linkedinUrl ? [company.linkedinUrl] : undefined,
    //   searchQuery: company.linkedinUrl ? undefined : company.name,
    //   maxItems: MAX_CONTACTS_PER_COMPANY,
    // });
    const items: HarvestProfileItem[] = [FIXTURE_PROFILE_ITEM];

    return items.map((item) => ({
      companyId: company.id,
      firstName: item.firstName,
      lastName: item.lastName,
      jobTitle: item.headline ?? "Poste inconnu",
      linkedinUrl: item.linkedinUrl,
      email: item.email ?? null,
      location: item.location?.linkedinText ?? null,
      raw: item,
    }));
  }

  // ⚠️ Paid Apify API call — consumes real account credits on every invocation.
  private async runActor<T>(actorId: string, input: Record<string, unknown>): Promise<T[]> {
    const url = `https://api.apify.com/v2/actors/${actorId}/run-sync-get-dataset-items`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Apify actor ${actorId} a échoué (${response.status}): ${await response.text()}`);
    }

    return response.json();
  }
}
