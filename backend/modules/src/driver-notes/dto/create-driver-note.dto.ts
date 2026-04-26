import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateDriverNoteDto {
  @IsString()
  @IsNotEmpty()
  vehicleType!: string;

  @IsString()
  driverName!: string;

  @IsString()
  @IsNotEmpty()
  fromSiteId!: string;

  @IsString()
  @IsNotEmpty()
  toSiteId!: string;

  @IsString()
  @MinLength(10)
  signatureSvg!: string;
}
