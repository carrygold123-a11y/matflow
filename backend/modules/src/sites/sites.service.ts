import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { SiteSummary } from '@matflow/shared-types';
import { assertApiSectionAccess, canAccessAllSites } from '../common/access-control';
import type { RequestUser } from '../common/request-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteDto } from './dto/create-site.dto';

@Injectable()
export class SitesService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(currentUser: RequestUser): Promise<SiteSummary[]> {
    // Drivers need to see all sites for delivery note creation
    const isDriver = currentUser.authMode === 'driver-pass';
    const sites = await this.prismaService.site.findMany({
      where: {
        deletedAt: null,
        ...(canAccessAllSites(currentUser) || isDriver ? {} : { id: currentUser.siteId }),
      },
      orderBy: { name: 'asc' },
    });

    return sites.map((site) => ({
      id: site.id,
      name: site.name,
      latitude: site.latitude,
      longitude: site.longitude,
    }));
  }

  async create(dto: CreateSiteDto, currentUser: RequestUser): Promise<SiteSummary> {
    assertApiSectionAccess(currentUser, 'sites', 'You are not allowed to create sites');

    if (!canAccessAllSites(currentUser)) {
      throw new BadRequestException('Only global roles can create sites');
    }

    if (!Number.isFinite(dto.latitude) || !Number.isFinite(dto.longitude)) {
      throw new BadRequestException('Invalid coordinates');
    }

    if (dto.latitude < -90 || dto.latitude > 90 || dto.longitude < -180 || dto.longitude > 180) {
      throw new BadRequestException('Coordinates out of range');
    }

    const site = await this.prismaService.site.create({
      data: {
        name: dto.name.trim(),
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    return {
      id: site.id,
      name: site.name,
      latitude: site.latitude,
      longitude: site.longitude,
    };
  }

  async dependents(id: string): Promise<{ users: number; materials: number; trucks: number; sitePlans: number; transports: number }> {
    const [users, materials, trucks, sitePlans, outbound, inbound] = await this.prismaService.$transaction([
      this.prismaService.user.count({ where: { siteId: id } }),
      this.prismaService.material.count({ where: { siteId: id, deletedAt: null } }),
      this.prismaService.truck.count({ where: { siteId: id } }),
      this.prismaService.sitePlan.count({ where: { siteId: id } }),
      this.prismaService.transportRequest.count({ where: { fromSiteId: id } }),
      this.prismaService.transportRequest.count({ where: { toSiteId: id } }),
    ]);
    return { users, materials, trucks, sitePlans, transports: outbound + inbound };
  }

  async remove(id: string, currentUser: RequestUser): Promise<{ id: string }> {
    assertApiSectionAccess(currentUser, 'sites', 'You are not allowed to delete sites');

    if (!canAccessAllSites(currentUser)) {
      throw new BadRequestException('Only global roles can delete sites');
    }

    const site = await this.prismaService.site.findUnique({ where: { id } });
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    const [usersCount, materialsCount, trucksCount, plansCount, outboundCount, inboundCount] = await this.prismaService.$transaction([
      this.prismaService.user.count({ where: { siteId: id } }),
      this.prismaService.material.count({ where: { siteId: id } }),
      this.prismaService.truck.count({ where: { siteId: id } }),
      this.prismaService.sitePlan.count({ where: { siteId: id } }),
      this.prismaService.transportRequest.count({ where: { fromSiteId: id } }),
      this.prismaService.transportRequest.count({ where: { toSiteId: id } }),
    ]);

    if (usersCount + materialsCount + trucksCount + plansCount + outboundCount + inboundCount > 0) {
      throw new BadRequestException('Site cannot be deleted while users, materials, trucks, plans, or transports still reference it');
    }

    await this.prismaService.site.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id };
  }
}
