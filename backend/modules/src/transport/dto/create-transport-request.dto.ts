import { IsString } from 'class-validator';

export class CreateTransportRequestDto {
  @IsString()
  materialId!: string;

  @IsString()
  toSiteId!: string;

  @IsString()
  truckId!: string;
}
