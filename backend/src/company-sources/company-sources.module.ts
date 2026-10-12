import { Module } from "@nestjs/common";
import { AgencyDirectorySource } from "./agency-directory.source";
import { CompanySourcesService } from "./company-sources.service";
import { GoogleMapsSource } from "./google-maps.source";
import { LinkedInCompaniesSource } from "./linkedin-companies.source";
import { TaxonomyPickerService } from "./taxonomy-picker.service";

@Module({
  providers: [
    CompanySourcesService,
    TaxonomyPickerService,
    LinkedInCompaniesSource,
    AgencyDirectorySource,
    GoogleMapsSource,
  ],
  exports: [CompanySourcesService],
})
export class CompanySourcesModule {}
