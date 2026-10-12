import { ProspectTargetType } from "@prisma/client";
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";
import { MAX_PROSPECTS_PER_RUN, MIN_PROSPECTS_PER_RUN } from "../../scraping/scraping.constants";

export class CreateProspectListDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(ProspectTargetType)
  targetType: ProspectTargetType;

  @IsString()
  @MinLength(1)
  offerDescription: string;

  @IsOptional()
  @IsString()
  valueProposition?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  targetIndustries: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  targetCompanySizeMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  targetCompanySizeMax?: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  targetLocations: string[];

  // Local businesses have no decision-maker search: the establishment itself is the prospect.
  @ValidateIf((dto: CreateProspectListDto) => dto.targetType !== ProspectTargetType.LOCAL_BUSINESSES)
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  targetJobTitles?: string[];

  @IsOptional()
  @IsString()
  additionalCriteria?: string;

  @IsOptional()
  @IsString()
  exclusions?: string;

  @IsOptional()
  @IsInt()
  @Min(MIN_PROSPECTS_PER_RUN)
  @Max(MAX_PROSPECTS_PER_RUN)
  maxProspects?: number;
}
