import { Injectable } from "@nestjs/common";
import { ProspectTargetType } from "@prisma/client";
import { AgencyDirectorySource } from "./agency-directory.source";
import { CompanySource } from "./company-source";
import { GoogleMapsSource } from "./google-maps.source";
import { LinkedInCompaniesSource } from "./linkedin-companies.source";

@Injectable()
export class CompanySourcesService {
  private readonly sources: Record<ProspectTargetType, CompanySource>;

  constructor(
    linkedInCompanies: LinkedInCompaniesSource,
    agencyDirectory: AgencyDirectorySource,
    googleMaps: GoogleMapsSource,
  ) {
    this.sources = {
      [ProspectTargetType.B2B_COMPANIES]: linkedInCompanies,
      [ProspectTargetType.AGENCIES_FREELANCERS]: agencyDirectory,
      [ProspectTargetType.LOCAL_BUSINESSES]: googleMaps,
    };
  }

  forTargetType(targetType: ProspectTargetType): CompanySource {
    return this.sources[targetType];
  }
}
