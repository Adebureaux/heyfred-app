import { Module } from "@nestjs/common";
import { ProspectQualifierService } from "./prospect-qualifier.service";

@Module({
  providers: [ProspectQualifierService],
  exports: [ProspectQualifierService],
})
export class QualificationModule {}
