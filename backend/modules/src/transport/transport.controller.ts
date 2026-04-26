import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { DriverLoadingScanPayload, DriverUnloadingScanPayload, TransportRequestItem } from '@matflow/shared-types';
import type { RequestUser } from '../common/request-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTransportRequestDto } from './dto/create-transport-request.dto';
import { DriverLoadingScanDto } from './dto/driver-loading-scan.dto';
import { DriverUnloadingScanDto } from './dto/driver-unloading-scan.dto';
import { UpdateTransportStatusDto } from './dto/update-transport-status.dto';
import { TransportService } from './transport.service';

@Controller('transport-requests')
@UseGuards(JwtAuthGuard)
export class TransportController {
  constructor(private readonly transportService: TransportService) {}

  @Get()
  list(
    @Query('status') status?: 'planned' | 'in_transit' | 'delivered',
    @Req() req?: { user: RequestUser },
  ): Promise<TransportRequestItem[]> {
    return this.transportService.list(status, req?.user as RequestUser);
  }

  @Post()
  create(
    @Body() dto: CreateTransportRequestDto,
    @Req() req: { user: RequestUser },
  ): Promise<TransportRequestItem> {
    return this.transportService.create(dto, req.user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Req() req: { user: RequestUser },
    @Body() dto: UpdateTransportStatusDto,
  ): Promise<TransportRequestItem> {
    return this.transportService.updateStatus(id, dto, req.user);
  }

  @Get('driver/current')
  getDriverCurrent(@Req() req: { user: RequestUser }): Promise<TransportRequestItem> {
    return this.transportService.getDriverCurrent(req.user);
  }

  @Post(':id/driver/loading-scan')
  confirmLoading(
    @Param('id') id: string,
    @Req() req: { user: RequestUser },
    @Body() dto: DriverLoadingScanDto & DriverLoadingScanPayload,
  ): Promise<TransportRequestItem> {
    return this.transportService.confirmDriverLoading(id, dto, req.user);
  }

  @Post(':id/driver/unloading-scan')
  confirmUnloading(
    @Param('id') id: string,
    @Req() req: { user: RequestUser },
    @Body() dto: DriverUnloadingScanDto & DriverUnloadingScanPayload,
  ): Promise<TransportRequestItem> {
    return this.transportService.confirmDriverUnloading(id, dto, req.user);
  }
}
