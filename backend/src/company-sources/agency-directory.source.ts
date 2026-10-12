import { Injectable } from "@nestjs/common";
import { ProspectList } from "@prisma/client";
import { CompanySource, SourcedCompany, domainOf, nonEmptyString } from "./company-source";
import { TaxonomyPickerService } from "./taxonomy-picker.service";

// The full category list documented by the actor.
const AGENCY_CATEGORIES = [
  "digital-marketing",
  "seo",
  "ppc-paid-media",
  "social-media-marketing",
  "content-marketing",
  "email-marketing",
  "public-relations",
  "advertising",
  "influencer-marketing",
  "lead-generation",
  "web-design",
  "web-development",
  "ecommerce",
  "software-development",
  "mobile-app-development",
  "ui-ux-design",
  "branding",
  "graphic-design",
  "video-production",
  "ai",
  "cybersecurity",
  "cloud-consulting",
  "blockchain",
  "market-research",
  "it-services",
  "marketing-strategy",
  "marketing-automation",
  "game-development",
];

@Injectable()
export class AgencyDirectorySource implements CompanySource {
  // "Agency Leads Scraper" (Clutch, DesignRush, Sortlist, with contact details).
  readonly actorId = "Li9ZVB6VTbmMz7Lvl";
  readonly prospectsPerCompany = 1;

  constructor(private readonly picker: TaxonomyPickerService) {}

  async buildInput(list: ProspectList, poolSize: number) {
    const categories = await this.picker.pick(
      list.targetIndustries,
      AGENCY_CATEGORIES,
      "Options are the service categories agencies and freelancers are listed under on Clutch, DesignRush and Sortlist.",
    );
    return {
      categories,
      // The actor filters by country only (name or ISO code).
      location: list.targetLocations[0] ?? "",
      includeContactDetails: true,
      maxResults: poolSize,
    };
  }

  toCompanies(items: Record<string, unknown>[]): SourcedCompany[] {
    return items.flatMap((item) => {
      const name = nonEmptyString(item.name);
      if (!name) return [];
      return [
        {
          name,
          domain: domainOf(nonEmptyString(item.website)),
          // A freelancer's listing links their personal profile (/in/...), an agency's its page.
          linkedinUrl: nonEmptyString(item.linkedinUrl),
          linkedinCompanyId: null,
          email: nonEmptyString(item.email),
          phone: nonEmptyString(item.phone),
          raw: item,
        },
      ];
    });
  }
}
