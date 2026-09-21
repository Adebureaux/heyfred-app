import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ScrapingService } from "../scraping/scraping.service";
import { CampaignsService } from "./campaigns.service";
import { CreateCampaignDto } from "./dto/create-campaign.dto";

@UseGuards(JwtAuthGuard)
@Controller("campaigns")
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly scrapingService: ScrapingService,
  ) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.campaignsService.findAllForUser(user.id);
  }

  @Get(":id")
  findOne(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.campaignsService.findOneForUser(user.id, id);
  }

  @Post(":id/scraping")
  async triggerScraping(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    await this.campaignsService.findOneForUser(user.id, id);
    return this.scrapingService.triggerForCampaign(id);
  }

  @Get(":id/scraping-jobs")
  async scrapingJobs(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    await this.campaignsService.findOneForUser(user.id, id);
    return this.scrapingService.listJobsForCampaign(id);
  }

  @Get(":id/contacts")
  async contacts(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    await this.campaignsService.findOneForUser(user.id, id);
    return this.scrapingService.listContactsForCampaign(id);
  }
}
