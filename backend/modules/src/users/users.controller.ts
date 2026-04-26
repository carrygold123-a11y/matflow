import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { AuthUser } from '@matflow/shared-types';
import type { RequestUser } from '../common/request-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Req() req: { user: RequestUser }): Promise<AuthUser[]> {
    return this.usersService.list(req.user);
  }

  @Get('me')
  me(@Req() req: { user: RequestUser }): Promise<AuthUser> {
    return this.usersService.me(req.user);
  }
}
