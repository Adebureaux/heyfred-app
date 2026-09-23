import { Module } from "@nestjs/common";
import { AiActorSelectionService } from "./ai-actor-selection.service";
import { ApifyStoreService } from "./apify-store.service";

@Module({
  providers: [AiActorSelectionService, ApifyStoreService],
  exports: [AiActorSelectionService],
})
export class AiActorSelectionModule {}
