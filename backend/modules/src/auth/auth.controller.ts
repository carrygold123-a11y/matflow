import { Body, Controller, Post } from '@nestjs/common';
import type { DriverLoginResponse, LoginResponse } from '@matflow/shared-types';
import { AuthService } from './auth.service';
import { DriverLoginDto, LoginDto } from './dto.login';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  @Post('driver-login')
  driverLogin(@Body() dto: DriverLoginDto): Promise<DriverLoginResponse> {
    return this.authService.driverLogin(dto);
  }
}
