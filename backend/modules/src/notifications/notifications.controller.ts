import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { NotificationEventItem } from '@matflow/shared-types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestUser } from '../common/request-user.interface';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@Req() req: { user: RequestUser }): Promise<NotificationEventItem[]> {
    return this.notificationsService.list(req.user);
  }
}
