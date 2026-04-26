import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { DomainEventPayload } from './notification-events';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsListener {
  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent('material.created')
  @OnEvent('material.reserved')
  @OnEvent('material.status.changed')
  @OnEvent('transport.created')
  @OnEvent('transport.status.changed')
  handleDomainEvent(event: DomainEventPayload): Promise<void> {
    return this.notificationsService.logEvent(event);
  }
}
