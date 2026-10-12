import { Injectable } from "@nestjs/common";
import { ProspectList } from "@prisma/client";
import { CompanySource, SourcedCompany, domainOf, nonEmptyString } from "./company-source";

function firstString(value: unknown): string | null {
  return Array.isArray(value) ? nonEmptyString(value[0]) : null;
}

@Injectable()
export class GoogleMapsSource implements CompanySource {
  // "Google Maps Scraper" (compass).
  readonly actorId = "nwua9Gu5YrADL7ZDj";
  // For local businesses the establishment itself is the prospect.
  readonly prospectsPerCompany = 1;

  async buildInput(list: ProspectList, poolSize: number) {
    // Google Maps takes plain search terms ("restaurant", "boulangerie"), so the user's own
    // words are used as-is — no taxonomy to map onto.
    const terms = list.targetIndustries;
    return {
      searchStringsArray: terms,
      locationQuery: list.targetLocations[0],
      maxCrawledPlacesPerSearch: Math.ceil(poolSize / terms.length),
      language: "fr",
      skipClosedPlaces: true,
      // Pulls emails and social profiles from each place's website — the only way to get an
      // email for an establishment.
      scrapeContacts: true,
    };
  }

  toCompanies(items: Record<string, unknown>[]): SourcedCompany[] {
    return items.flatMap((item) => {
      const name = nonEmptyString(item.title);
      if (!name) return [];
      return [
        {
          name,
          domain: domainOf(nonEmptyString(item.website)),
          linkedinUrl: firstString(item.linkedIns),
          linkedinCompanyId: null,
          email: firstString(item.emails),
          phone: nonEmptyString(item.phone),
          raw: item,
        },
      ];
    });
  }
}
