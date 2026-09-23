import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ScrapingService } from "../scraping/scraping.service";
import { CreateProspectListDto } from "./dto/create-prospect-list.dto";
import { ProspectListsService } from "./prospect-lists.service";

@UseGuards(JwtAuthGuard)
@Controller("prospect-lists")
export class ProspectListsController {
  constructor(
    private readonly prospectListsService: ProspectListsService,
    private readonly scrapingService: ScrapingService,
  ) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateProspectListDto) {
    return this.prospectListsService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.prospectListsService.findAllForUser(user.id);
  }

  @Get(":id")
  findOne(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.prospectListsService.findOneForUser(user.id, id);
  }

  @Post(":id/run")
  async run(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    await this.prospectListsService.findOneForUser(user.id, id);
    return this.scrapingService.triggerForProspectList(id);
  }

  @Get(":id/runs")
  async runs(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    await this.prospectListsService.findOneForUser(user.id, id);
    return this.scrapingService.listRunsForProspectList(id);
  }

  @Get(":id/prospects")
  async prospects(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    await this.prospectListsService.findOneForUser(user.id, id);
    return this.prospectListsService.listProspectsForUser(id);
  }
}
