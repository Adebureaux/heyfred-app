import { Injectable } from "@nestjs/common";
import { ProspectList } from "@prisma/client";
import { CompanySource, SourcedCompany, domainOf, nonEmptyString } from "./company-source";
import { LINKEDIN_INDUSTRIES } from "./linkedin-industries";
import { TaxonomyPickerService } from "./taxonomy-picker.service";

// The only company-size values the actor accepts (anything else fails the search).
const SIZE_BANDS: { band: string; min: number; max: number }[] = [
  { band: "1-10", min: 1, max: 10 },
  { band: "11-50", min: 11, max: 50 },
  { band: "51-200", min: 51, max: 200 },
  { band: "201-500", min: 201, max: 500 },
  { band: "501-1000", min: 501, max: 1000 },
  { band: "1001-5000", min: 1001, max: 5000 },
  { band: "5001-10000", min: 5001, max: 10000 },
  { band: "10001+", min: 10001, max: Infinity },
];

const INDUSTRY_CODE_BY_LABEL = new Map(LINKEDIN_INDUSTRIES.map((industry) => [industry.label, industry.code]));

// A band only counts if it overlaps the range by more than its edge: confirmed by the eval
// harness (2026-10-12) that "50-500 employees" pulling in the 11-50 band (via its single shared
// value, 50) mostly brought back companies far too small.
function overlappingSizeBands(min: number | null, max: number | null): string[] {
  if (min === null && max === null) return [];
  const low = min ?? 0;
  const high = max ?? Infinity;
  return SIZE_BANDS.filter((size) => size.min < high && size.max > low).map((size) => size.band);
}

@Injectable()
export class LinkedInCompaniesSource implements CompanySource {
  // "LinkedIn Company Search — Query, Industry, Size" (neuralverge).
  readonly actorId = "vrhZsJhq8xNbmzIUV";
  readonly prospectsPerCompany = 2;

  constructor(private readonly picker: TaxonomyPickerService) {}

  async buildInput(list: ProspectList, poolSize: number) {
    const industries = await this.picker.pick(
      list.targetIndustries,
      LINKEDIN_INDUSTRIES.map((industry) => industry.label),
      "Options are LinkedIn's industry categories; pick those the target companies belong to.",
    );
    const companySize = overlappingSizeBands(list.targetCompanySizeMin, list.targetCompanySizeMax);
    return {
      // Required in practice despite the schema marking it optional — confirmed by real testing
      // (2026-10-12): every run without it failed with "No search query provided". The industry
      // codes do the real targeting; one keyword in the user's own words keeps the search broad
      // (several keywords narrow it, since LinkedIn matches all of them).
      searchQuery: list.targetIndustries[0],
      industryIds: industries.map((label) => INDUSTRY_CODE_BY_LABEL.get(label)!),
      ...(companySize.length > 0 ? { companySize } : {}),
      locations: list.targetLocations,
      // "full" adds website, exact headcount and every office — what judging fit needs.
      scraperMode: "full",
      maxItems: poolSize,
    };
  }

  toCompanies(items: Record<string, unknown>[]): SourcedCompany[] {
    return items.flatMap((item) => {
      const name = nonEmptyString(item.name);
      const linkedinUrl = nonEmptyString(item.linkedinUrl);
      // Showcase pages are sub-pages of a company (a product or a brand), not companies anyone
      // works at — people search on them finds nobody.
      if (!name || linkedinUrl?.includes("/showcase/")) return [];
      const linkedinId = item.id;
      return [
        {
          name,
          domain: domainOf(nonEmptyString(item.website)),
          linkedinUrl,
          // The actor's `id` is LinkedIn's own company id, which Unipile's people search filters
          // on directly — no need to re-resolve the company by name (which can mis-match).
          linkedinCompanyId:
            typeof linkedinId === "string" || typeof linkedinId === "number" ? String(linkedinId) : null,
          email: null,
          phone: nonEmptyString(item.phone),
          raw: item,
        },
      ];
    });
  }
}
