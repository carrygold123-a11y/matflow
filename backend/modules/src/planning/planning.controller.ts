import { Body, Controller, Get, Put, Query, Req, UseGuards } from '@nestjs/common';
import type { SitePlanItem } from '@matflow/shared-types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestUser } from '../common/request-user.interface';
import { GetSitePlanDto } from './dto/get-site-plan.dto';
import { UpsertSitePlanDto } from './dto/upsert-site-plan.dto';
import { PlanningService } from './planning.service';

@Controller('site-plans')
@UseGuards(JwtAuthGuard)
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Get()
  getOne(
    @Query() query: GetSitePlanDto,
    @Req() req: { user: RequestUser },
  ): Promise<SitePlanItem> {
    return this.planningService.getOne(query, req.user);
  }

  @Put()
  upsert(
    @Query() query: GetSitePlanDto,
    @Body() dto: UpsertSitePlanDto,
    @Req() req: { user: RequestUser },
  ): Promise<SitePlanItem> {
    return this.planningService.upsert(query, dto, req.user);
  }
}