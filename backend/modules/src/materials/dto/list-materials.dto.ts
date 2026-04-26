import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Min } from 'class-validator';

const toOptionalNumber = ({ value }: { value: unknown }): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
};

export class ListMaterialsDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(['available', 'reserved', 'picked_up'])
  status?: 'available' | 'reserved' | 'picked_up';

  @IsOptional()
  @Transform(toOptionalNumber)
  @Min(0)
  distance?: number;

  @IsOptional()
  @Transform(toOptionalNumber)
  lat?: number;

  @IsOptional()
  @Transform(toOptionalNumber)
  lng?: number;
}
