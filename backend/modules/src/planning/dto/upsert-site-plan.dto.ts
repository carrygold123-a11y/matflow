import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

const sitePlanStatuses = ['draft', 'published'] as const;
const sitePlanShiftStatuses = ['not_ready', 'ready', 'active', 'blocked', 'complete'] as const;
const sitePlanPriorities = ['critical', 'focus', 'ready'] as const;
const sitePlanBriefingCategories = ['operations', 'safety', 'logistics'] as const;
const sitePlanMaterialNeedStatuses = ['needed', 'ordered', 'ready', 'delivered'] as const;

class SitePlanBriefingDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  category!: (typeof sitePlanBriefingCategories)[number];

  @IsString()
  title!: string;

  @IsString()
  note!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

class SitePlanAssignmentDto {
  @IsString()
  userId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

class SitePlanMaterialNeedDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  materialId?: string | null;

  @IsString()
  label!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsString()
  unit!: string;

  @IsString()
  status!: (typeof sitePlanMaterialNeedStatuses)[number];

  @IsString()
  notes!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

class SitePlanZoneDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name!: string;

  @IsString()
  shiftLabel!: string;

  @IsString()
  focus!: string;

  @IsString()
  supportCategory!: string;

  @IsString({ each: false })
  priority!: (typeof sitePlanPriorities)[number];

  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder!: number;

  @IsOptional()
  @IsString()
  leadUserId?: string | null;

  @IsOptional()
  @IsString()
  supportMaterialId?: string | null;

  @IsOptional()
  @IsString()
  supportTruckId?: string | null;

  @IsOptional()
  @IsString()
  activeTransportId?: string | null;

  @IsArray()
  @ArrayMaxSize(24)
  @ValidateNested({ each: true })
  @Type(() => SitePlanMaterialNeedDto)
  materialNeeds!: SitePlanMaterialNeedDto[];

  @IsArray()
  @ArrayMaxSize(24)
  @ValidateNested({ each: true })
  @Type(() => SitePlanAssignmentDto)
  assignments!: SitePlanAssignmentDto[];
}

export class UpsertSitePlanDto {
  @IsString()
  planDate!: string;

  @IsString()
  status!: (typeof sitePlanStatuses)[number];

  @IsString()
  shiftStatus!: (typeof sitePlanShiftStatuses)[number];

  @IsString()
  briefing!: string;

  @IsString()
  safetyNotes!: string;

  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => SitePlanBriefingDto)
  briefings!: SitePlanBriefingDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => SitePlanZoneDto)
  zones!: SitePlanZoneDto[];
}

export {
  sitePlanBriefingCategories,
  sitePlanMaterialNeedStatuses,
  sitePlanPriorities,
  sitePlanShiftStatuses,
  sitePlanStatuses,
  SitePlanAssignmentDto,
  SitePlanBriefingDto,
  SitePlanMaterialNeedDto,
  SitePlanZoneDto,
};