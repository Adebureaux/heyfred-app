import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateProspectListDto {
  @IsString()
  @MinLength(1)
  name: string;

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

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  targetJobTitles: string[];

  @IsOptional()
  @IsString()
  additionalCriteria?: string;

  @IsOptional()
  @IsString()
  exclusions?: string;
}
