import { IsOptional, IsString } from 'class-validator';

export class GetSitePlanDto {
  @IsOptional()
  @IsString()
  siteId?: string;

  @IsOptional()
  @IsString()
  planDate?: string;
}