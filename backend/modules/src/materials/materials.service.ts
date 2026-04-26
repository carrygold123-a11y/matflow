import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { MaterialItem, SiteSummary } from '@matflow/shared-types';
import { haversineDistance, suggestCategory } from '@matflow/shared-utils';
import { assertApiSectionAccess, assertSiteVisibility, canAccessAllSites } from '../common/access-control';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { UploadedFile } from '../storage/uploaded-file.interface';
import type { RequestUser } from '../common/request-user.interface';
import { CreateMaterialDto } from './dto/create-material.dto';
import { ListMaterialsDto } from './dto/list-materials.dto';
import { UpdateMaterialStatusDto } from './dto/update-material-status.dto';

interface MaterialWithSite {
  id: string;
  title: string;
  description: string;
  category: string;
  quantity: number;
  condition: 'new' | 'good' | 'used' | 'damaged';
  imageUrl: string;
  latitude: number;
  longitude: number;
  siteId: string;
  status: 'available' | 'reserved' | 'picked_up';
  suggestedCategory: string | null;
  reservedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  site: SiteSummary;
}

@Injectable()
export class MaterialsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async list(query: ListMaterialsDto, currentUser?: RequestUser): Promise<MaterialItem[]> {
    const referencePoint = await this.resolveReferencePoint(query, currentUser);
    const materials = await this.prismaService.material.findMany({
      where: {
        deletedAt: null,
        category: query.category || undefined,
        status: query.status || undefined,
        siteId: currentUser && !canAccessAllSites(currentUser) ? currentUser.siteId : undefined,
        OR: query.text
          ? [
              { title: { contains: query.text, mode: 'insensitive' } },
              { description: { contains: query.text, mode: 'insensitive' } },
              { category: { contains: query.text, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: { site: true },
      take: 200,
    });

    return materials
      .map((material) => this.toMaterialItem(material as unknown as MaterialWithSite, referencePoint))
      .filter((material) => (query.distance ? material.distanceKm <= query.distance : true))
      .sort((left, right) => left.distanceKm - right.distanceKm || right.createdAt.localeCompare(left.createdAt));
  }

  async nearby(query: ListMaterialsDto, currentUser?: RequestUser): Promise<MaterialItem[]> {
    return this.list(query, currentUser);
  }

  async getOne(id: string, currentUser: RequestUser): Promise<MaterialItem> {
    const material = await this.prismaService.material.findUnique({
      where: { id, deletedAt: null },
      include: { site: true },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    assertSiteVisibility(currentUser, material.siteId, 'You can only access material from your assigned site');

    const referencePoint = await this.resolveReferencePoint({}, currentUser);
    return this.toMaterialItem(material as unknown as MaterialWithSite, referencePoint);
  }

  async create(dto: CreateMaterialDto, file: UploadedFile | undefined, currentUser: RequestUser): Promise<MaterialItem> {
    assertApiSectionAccess(currentUser, 'materials', 'You are not allowed to create materials');

    if (!file) {
      throw new BadRequestException('Image upload is required');
    }

    assertSiteVisibility(currentUser, dto.siteId, 'You can only create material for your assigned site');

    const site = await this.prismaService.site.findUnique({ where: { id: dto.siteId } });
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    const imageUrl = await this.storageService.saveMaterialImage(file);
    const suggestedCategory = suggestCategory(`${dto.title} ${dto.description}`);

    const material = await this.prismaService.material.create({
      data: {
        title: dto.title.trim(),
        description: dto.description.trim(),
        category: dto.category?.trim() || suggestedCategory,
        quantity: dto.quantity,
        condition: dto.condition,
        imageUrl,
        latitude: dto.latitude,
        longitude: dto.longitude,
        siteId: dto.siteId,
        status: 'available',
        suggestedCategory,
        createdById: currentUser.id,
      },
      include: { site: true },
    });

    this.eventEmitter.emit('material.created', {
      type: 'material.created',
      entityType: 'material',
      entityId: material.id,
      message: `${material.title} was added by ${currentUser.name}.`,
      payload: {
        siteId: material.siteId,
        status: material.status,
        materialTitle: material.title,
        actorName: currentUser.name,
      },
    });

    return this.toMaterialItem(material as unknown as MaterialWithSite, {
      lat: dto.latitude,
      lng: dto.longitude,
    });
  }

  async reserve(id: string, currentUser: RequestUser): Promise<MaterialItem> {
    const existingMaterial = await this.prismaService.material.findUnique({
      where: { id },
      include: { site: true },
    });

    if (!existingMaterial) {
      throw new NotFoundException('Material not found');
    }

    assertApiSectionAccess(currentUser, 'materials', 'You are not allowed to reserve materials');
    assertSiteVisibility(currentUser, existingMaterial.siteId, 'You can only reserve material from your assigned site');

    if (existingMaterial.status !== 'available') {
      throw new BadRequestException('Only available material can be reserved');
    }

    const material = await this.prismaService.material.update({
      where: { id },
      data: {
        status: 'reserved',
        reservedById: currentUser.id,
      },
      include: { site: true },
    });

    this.eventEmitter.emit('material.reserved', {
      type: 'material.reserved',
      entityType: 'material',
      entityId: material.id,
      message: `${material.title} was reserved by ${currentUser.name}.`,
      payload: {
        reservedById: currentUser.id,
        siteId: material.siteId,
        materialTitle: material.title,
        actorName: currentUser.name,
      },
    });

    const referencePoint = await this.resolveReferencePoint({}, currentUser);
    return this.toMaterialItem(material as unknown as MaterialWithSite, referencePoint);
  }

  async updateStatus(id: string, dto: UpdateMaterialStatusDto, currentUser: RequestUser): Promise<MaterialItem> {
    const existingMaterial = await this.prismaService.material.findUnique({
      where: { id },
      include: { site: true },
    });

    if (!existingMaterial) {
      throw new NotFoundException('Material not found');
    }

    assertApiSectionAccess(currentUser, 'materials', 'You are not allowed to update material status');
    assertSiteVisibility(currentUser, existingMaterial.siteId, 'You can only update material from your assigned site');

    const material = await this.prismaService.material.update({
      where: { id },
      data: {
        status: dto.status,
        reservedById: dto.status === 'available' ? null : existingMaterial.reservedById,
      },
      include: { site: true },
    });

    this.eventEmitter.emit('material.status.changed', {
      type: 'material.status.changed',
      entityType: 'material',
      entityId: material.id,
      message: `${material.title} moved to status ${material.status}.`,
      payload: {
        previousStatus: existingMaterial.status,
        currentStatus: material.status,
        updatedBy: currentUser.id,
        materialTitle: material.title,
        actorName: currentUser.name,
      },
    });

    const referencePoint = await this.resolveReferencePoint({}, currentUser);
    return this.toMaterialItem(material as unknown as MaterialWithSite, referencePoint);
  }

  async dependents(id: string): Promise<{ transports: number; zones: number }> {
    const [transports, zones] = await this.prismaService.$transaction([
      this.prismaService.transportRequest.count({ where: { materialId: id } }),
      this.prismaService.sitePlanZone.count({ where: { supportMaterialId: id } }),
    ]);
    return { transports, zones };
  }

  async remove(id: string, currentUser: RequestUser): Promise<{ id: string }> {
    const existingMaterial = await this.prismaService.material.findUnique({
      where: { id },
      include: { site: true },
    });

    if (!existingMaterial) {
      throw new NotFoundException('Material not found');
    }

    assertApiSectionAccess(currentUser, 'materials', 'You are not allowed to delete materials');
    assertSiteVisibility(currentUser, existingMaterial.siteId, 'You can only delete material from your assigned site');

    const [transportRefs, zoneRefs] = await this.prismaService.$transaction([
      this.prismaService.transportRequest.count({ where: { materialId: id } }),
      this.prismaService.sitePlanZone.count({ where: { supportMaterialId: id } }),
    ]);

    if (transportRefs + zoneRefs > 0) {
      throw new BadRequestException('Material cannot be deleted while transports or planning zones still reference it');
    }

    await this.prismaService.material.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id };
  }

  private async resolveReferencePoint(query: Partial<ListMaterialsDto>, currentUser?: RequestUser): Promise<{ lat: number; lng: number }> {
    if (typeof query.lat === 'number' && typeof query.lng === 'number') {
      return { lat: query.lat, lng: query.lng };
    }

    if (currentUser?.siteId) {
      const site = await this.prismaService.site.findUnique({ where: { id: currentUser.siteId } });
      if (site) {
        return {
          lat: site.latitude,
          lng: site.longitude,
        };
      }
    }

    throw new BadRequestException('Reference coordinates are required');
  }

  private toMaterialItem(material: MaterialWithSite, referencePoint: { lat: number; lng: number }): MaterialItem {
    return {
      id: material.id,
      title: material.title,
      description: material.description,
      category: material.category,
      quantity: material.quantity,
      condition: material.condition,
      imageUrl: material.imageUrl,
      location: {
        lat: material.latitude,
        lng: material.longitude,
      },
      siteId: material.siteId,
      site: material.site,
      status: material.status,
      distanceKm: haversineDistance(referencePoint, {
        lat: material.latitude,
        lng: material.longitude,
      }),
      suggestedCategory: material.suggestedCategory,
      reservedById: material.reservedById,
      createdAt: material.createdAt.toISOString(),
      updatedAt: material.updatedAt.toISOString(),
    };
  }
}
