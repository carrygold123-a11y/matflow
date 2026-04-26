import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { SiteSummary } from '@matflow/shared-types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestUser } from '../common/request-user.interface';
import { CreateSiteDto } from './dto/create-site.dto';
import { SitesService } from './sites.service';

@Controller('sites')
@UseGuards(JwtAuthGuard)
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  list(@Req() req: { user: RequestUser }): Promise<SiteSummary[]> {
    return this.sitesService.list(req.user);
  }

  @Get(':id/dependents')
  dependents(@Param('id') id: string): Promise<{ users: number; materials: number; trucks: number; sitePlans: number; transports: number }> {
    return this.sitesService.dependents(id);
  }

  @Post()
  create(@Body() dto: CreateSiteDto, @Req() req: { user: RequestUser }): Promise<SiteSummary> {
    return this.sitesService.create(dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: { user: RequestUser }): Promise<{ id: string }> {
    return this.sitesService.remove(id, req.user);
  }
}
