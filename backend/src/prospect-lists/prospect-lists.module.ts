import { Module } from "@nestjs/common";
import { ScrapingModule } from "../scraping/scraping.module";
import { ProspectListsController } from "./prospect-lists.controller";
import { ProspectListsService } from "./prospect-lists.service";

@Module({
  imports: [ScrapingModule],
  controllers: [ProspectListsController],
  providers: [ProspectListsService],
})
export class ProspectListsModule {}
