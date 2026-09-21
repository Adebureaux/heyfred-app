import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCampaignDto } from "./dto/create-campaign.dto";

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: { ...dto, userId },
    });
  }

  findAllForUser(userId: string) {
    return this.prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOneForUser(userId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, userId },
    });
    if (!campaign) {
      throw new NotFoundException("Campagne introuvable");
    }
    return campaign;
  }
}
