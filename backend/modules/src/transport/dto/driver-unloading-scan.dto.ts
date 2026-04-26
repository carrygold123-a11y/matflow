import { IsString, MinLength } from 'class-validator';

export class DriverUnloadingScanDto {
  @IsString()
  @MinLength(12)
  qrToken!: string;
}
