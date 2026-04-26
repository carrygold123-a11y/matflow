import { IsString, MaxLength, MinLength } from 'class-validator';

export class DriverLoadingScanDto {
  @IsString()
  @MinLength(12)
  qrToken!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  signedBy!: string;

  @IsString()
  @MinLength(32)
  @MaxLength(24000)
  signatureSvg!: string;
}
