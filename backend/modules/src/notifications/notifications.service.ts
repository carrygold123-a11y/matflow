import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { NotificationEventItem } from '@matflow/shared-types';
import { canAccessAllSites } from '../common/access-control';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../common/request-user.interface';
import type { DomainEventPayload } from './notification-events';

@Injectable()
export class NotificationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async logEvent(event: DomainEventPayload): Promise<void> {
    await this.prismaService.notificationEvent.create({
      data: {
        type: event.type,
        entityType: event.entityType,
        entityId: event.entityId,
        message: event.message,
        payload: event.payload as unknown as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async list(currentUser: RequestUser): Promise<NotificationEventItem[]> {
    const events = await this.prismaService.notificationEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return events
      .filter((event) => this.canViewEvent(currentUser, (event.payload as Record<string, unknown> | null) ?? null))
      .slice(0, 50)
      .map((event) => ({
        id: event.id,
        type: event.type,
        entityType: event.entityType,
        entityId: event.entityId,
        message: event.message,
        payload: (event.payload as Record<string, unknown> | null) ?? null,
        createdAt: event.createdAt.toISOString(),
      }));
  }

  private canViewEvent(currentUser: RequestUser, payload: Record<string, unknown> | null): boolean {
    if (canAccessAllSites(currentUser)) {
      return true;
    }

    const siteCandidates = [payload?.siteId, payload?.fromSiteId, payload?.toSiteId].filter(
      (value): value is string => typeof value === 'string',
    );

    if (!siteCandidates.length) {
      return false;
    }

    return siteCandidates.includes(currentUser.siteId);
  }
}
