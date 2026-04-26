import { Transform } from 'class-transformer';
import { IsNumber, IsString, MaxLength } from 'class-validator';

const toNumber = ({ value }: { value: unknown }): number => Number(value);

export class CreateSiteDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @Transform(toNumber)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  latitude!: number;

  @Transform(toNumber)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  longitude!: number;
}
