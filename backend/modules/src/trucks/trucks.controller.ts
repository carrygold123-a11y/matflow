import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { TruckItem } from '@matflow/shared-types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestUser } from '../common/request-user.interface';
import { TrucksService } from './trucks.service';

@Controller('trucks')
@UseGuards(JwtAuthGuard)
export class TrucksController {
  constructor(private readonly trucksService: TrucksService) {}

  @Get()
  list(@Query('available') available: string | undefined, @Req() req: { user: RequestUser }): Promise<TruckItem[]> {
    const parsedAvailable = available === undefined ? undefined : available === 'true';
    return this.trucksService.list(parsedAvailable, req.user);
  }
}
