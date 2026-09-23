import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UnipileAccountStatus } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { UnipileService } from "./unipile.service";

interface UnipileWebhookPayload {
  status: string;
  account_id: string;
  name: string;
}

@Controller("unipile")
export class UnipileAccountsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unipileService: UnipileService,
    private readonly config: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get("status")
  async getStatus(@CurrentUser() user: { id: string }) {
    const account = await this.prisma.unipileAccount.findUnique({ where: { userId: user.id } });
    return { status: account?.status ?? UnipileAccountStatus.DISCONNECTED };
  }

  @UseGuards(JwtAuthGuard)
  @Post("connect")
  async connect(@CurrentUser() user: { id: string }) {
    const backendUrl = this.config.get<string>("BACKEND_PUBLIC_URL") ?? "http://localhost:3000";
    const frontendUrl = this.config.get<string>("FRONTEND_URL") ?? "http://localhost:9000";

    const { url } = await this.unipileService.startHostedAuth({
      internalUserId: user.id,
      notifyUrl: `${backendUrl}/unipile/webhook`,
      successRedirectUrl: `${frontendUrl}/settings/linkedin?connected=1`,
      failureRedirectUrl: `${frontendUrl}/settings/linkedin?connected=0`,
    });

    await this.prisma.unipileAccount.upsert({
      where: { userId: user.id },
      create: { userId: user.id, status: UnipileAccountStatus.DISCONNECTED },
      update: { status: UnipileAccountStatus.DISCONNECTED },
    });

    return { url };
  }

  // Manual fallback for accounts connected outside our hosted-auth flow (e.g. Unipile's
  // cookie-based method). Takes the first LinkedIn account across the whole Unipile
  // workspace — fine for single-user testing, but not multi-tenant-safe: with several real
  // users each connecting their own account, this would need to match by account name/id
  // the way the webhook already does, not just grab whichever comes first.
  @UseGuards(JwtAuthGuard)
  @Post("sync")
  async sync(@CurrentUser() user: { id: string }) {
    const accounts = await this.unipileService.listAccounts();
    const linkedInAccount = accounts.find((account) => account.type === "LINKEDIN");

    if (!linkedInAccount) {
      return { status: UnipileAccountStatus.DISCONNECTED };
    }

    await this.prisma.unipileAccount.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        status: UnipileAccountStatus.CONNECTED,
        unipileAccountId: linkedInAccount.id,
        connectedAt: new Date(),
      },
      update: {
        status: UnipileAccountStatus.CONNECTED,
        unipileAccountId: linkedInAccount.id,
        connectedAt: new Date(),
      },
    });

    return { status: UnipileAccountStatus.CONNECTED, name: linkedInAccount.name };
  }

  @Post("webhook")
  async webhook(@Body() payload: UnipileWebhookPayload) {
    const userId = payload.name;
    if (!userId) {
      return { received: true };
    }

    const status =
      payload.status === "CREATION_SUCCESS"
        ? UnipileAccountStatus.CONNECTED
        : UnipileAccountStatus.ERROR;

    await this.prisma.unipileAccount.upsert({
      where: { userId },
      create: {
        userId,
        status,
        unipileAccountId: payload.account_id,
        connectedAt: status === UnipileAccountStatus.CONNECTED ? new Date() : null,
      },
      update: {
        status,
        unipileAccountId: payload.account_id,
        connectedAt: status === UnipileAccountStatus.CONNECTED ? new Date() : null,
      },
    });

    return { received: true };
  }
}
