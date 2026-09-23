import { Injectable, NotFoundException } from "@nestjs/common";
import { ProspectListStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProspectListDto } from "./dto/create-prospect-list.dto";

@Injectable()
export class ProspectListsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateProspectListDto) {
    return this.prisma.prospectList.create({
      data: { ...dto, userId, status: ProspectListStatus.BRIEF_SET },
    });
  }

  findAllForUser(userId: string) {
    return this.prisma.prospectList.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOneForUser(userId: string, id: string) {
    const prospectList = await this.prisma.prospectList.findFirst({
      where: { id, userId },
    });
    if (!prospectList) {
      throw new NotFoundException("Prospect list not found");
    }
    return prospectList;
  }

  listProspectsForUser(prospectListId: string) {
    return this.prisma.prospect.findMany({
      where: { prospectListId },
      include: { company: true },
      orderBy: { createdAt: "desc" },
    });
  }
}
