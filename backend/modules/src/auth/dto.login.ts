import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class DriverLoginDto {
  @IsString()
  @MinLength(2)
  licensePlate!: string;
}
