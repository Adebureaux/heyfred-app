import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AiActorSelectionModule } from "../ai-actor-selection/ai-actor-selection.module";
import { UnipileModule } from "../unipile/unipile.module";
import { ApifyRunnerService } from "./apify-runner.service";
import { CompanySearchProcessor } from "./processors/company-search.processor";
import { ProspectEnrichmentProcessor } from "./processors/prospect-enrichment.processor";
import { COMPANY_SEARCH_QUEUE, PROSPECT_ENRICHMENT_QUEUE } from "./scraping.constants";
import { ScrapingService } from "./scraping.service";

@Module({
  imports: [
    BullModule.registerQueue({ name: COMPANY_SEARCH_QUEUE }, { name: PROSPECT_ENRICHMENT_QUEUE }),
    AiActorSelectionModule,
    UnipileModule,
  ],
  providers: [ScrapingService, ApifyRunnerService, CompanySearchProcessor, ProspectEnrichmentProcessor],
  exports: [ScrapingService],
})
export class ScrapingModule {}
