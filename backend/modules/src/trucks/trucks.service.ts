import { Injectable } from '@nestjs/common';
import type { TruckItem } from '@matflow/shared-types';
import { canAccessAllSites } from '../common/access-control';
import type { RequestUser } from '../common/request-user.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrucksService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(available: boolean | undefined, currentUser: RequestUser): Promise<TruckItem[]> {
    const trucks = await this.prismaService.truck.findMany({
      where: {
        available: typeof available === 'boolean' ? available : undefined,
        siteId: canAccessAllSites(currentUser) ? undefined : currentUser.siteId,
      },
      include: {
        site: true,
      },
      orderBy: [{ available: 'desc' }, { name: 'asc' }],
    });

    return trucks.map((truck) => ({
      id: truck.id,
      name: truck.name,
      licensePlate: truck.licensePlate,
      siteId: truck.siteId,
      available: truck.available,
      site: truck.site,
    }));
  }
}
