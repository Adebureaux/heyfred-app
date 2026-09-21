import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ApifyService } from "./apify.service";
import { CompanySearchProcessor } from "./processors/company-search.processor";
import { DecisionMakerSearchProcessor } from "./processors/decision-maker-search.processor";
import { COMPANY_SEARCH_QUEUE, DECISION_MAKER_SEARCH_QUEUE } from "./scraping.constants";
import { ScrapingService } from "./scraping.service";

@Module({
  imports: [
    BullModule.registerQueue({ name: COMPANY_SEARCH_QUEUE }, { name: DECISION_MAKER_SEARCH_QUEUE }),
  ],
  providers: [ScrapingService, ApifyService, CompanySearchProcessor, DecisionMakerSearchProcessor],
  exports: [ScrapingService],
})
export class ScrapingModule {}
