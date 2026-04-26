import { Transform } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const toNumber = ({ value }: { value: unknown }): number => Number(value);

export class CreateMaterialDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  @MaxLength(1500)
  description!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @Transform(toNumber)
  @Min(0.1)
  quantity!: number;

  @IsIn(['new', 'good', 'used', 'damaged'])
  condition!: 'new' | 'good' | 'used' | 'damaged';

  @IsString()
  siteId!: string;

  @Transform(toNumber)
  @IsNumber()
  latitude!: number;

  @Transform(toNumber)
  @IsNumber()
  longitude!: number;
}
