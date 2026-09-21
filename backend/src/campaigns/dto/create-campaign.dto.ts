import { LINKEDIN_INDUSTRIES } from "@heyfred/shared";
import { ArrayMinSize, IsArray, IsIn, IsOptional, IsString, MinLength } from "class-validator";

const VALID_INDUSTRY_IDS = LINKEDIN_INDUSTRIES.map((industry) => industry.id);

export class CreateCampaignDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  targetLocation: string;

  @IsString()
  @MinLength(1)
  targetSector: string;

  @IsIn(VALID_INDUSTRY_IDS)
  targetIndustryId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  targetJobTitles: string[];

  @IsOptional()
  @IsString()
  targetKeywords?: string;
}
