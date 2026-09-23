import { Module } from "@nestjs/common";
import { UnipileAccountsController } from "./unipile-accounts.controller";
import { UnipileService } from "./unipile.service";

@Module({
  controllers: [UnipileAccountsController],
  providers: [UnipileService],
  exports: [UnipileService],
})
export class UnipileModule {}
