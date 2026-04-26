import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AuthUser,
  MaterialItem,
  SitePlanItem,
  TransportRequestItem,
  TruckItem,
  UserRole,
} from '@matflow/shared-types';
import { canAccessAllSites, canEditPlanning, hasApiSectionAccess } from '../common/access-control';
import type { RequestUser } from '../common/request-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { GetSitePlanDto } from './dto/get-site-plan.dto';
import {
  sitePlanBriefingCategories,
  sitePlanMaterialNeedStatuses,
  sitePlanPriorities,
  sitePlanShiftStatuses,
  sitePlanStatuses,
  type SitePlanZoneDto,
  UpsertSitePlanDto,
} from './dto/upsert-site-plan.dto';

const leadPlanningRoles = new Set<UserRole>(['admin', 'bauleiter', 'manager', 'polier', 'vorarbeiter']);

const roleOrder: Record<UserRole, number> = {
  admin: 0,
  bauleiter: 1,
  manager: 2,
  polier: 3,
  vorarbeiter: 4,
  disponent: 5,
  lagerist: 6,
  fahrer: 7,
  worker: 8,
  subcontractor: 9,
};

const defaultZoneBlueprints = [
  {
    name: 'Rohbau',
    shiftLabel: '06:00-10:00',
    focus: 'Lastpfade, Betonage und Schalung absichern',
    supportCategory: 'Concrete',
    priority: 'critical',
  },
  {
    name: 'Technik',
    shiftLabel: '06:15-10:30',
    focus: 'Leitungswege und Ausbauachsen vorbereiten',
    supportCategory: 'Electrical',
    priority: 'focus',
  },
  {
    name: 'Logistik',
    shiftLabel: '05:45-09:00',
    focus: 'Reserve, Materialpuffer und Fahrerfenster koordinieren',
    supportCategory: 'Tools',
    priority: 'ready',
  },
] as const;

const sitePlanInclude = {
  site: true,
  updatedBy: {
    include: {
      site: true,
    },
  },
  briefings: true,
  zones: {
    include: {
      leadUser: {
        include: {
          site: true,
        },
      },
      supportMaterial: {
        include: {
          site: true,
        },
      },
      supportTruck: {
        include: {
          site: true,
        },
      },
      activeTransport: {
        include: {
          material: {
            include: {
              site: true,
            },
          },
          truck: {
            include: {
              site: true,
            },
          },
          fromSite: true,
          toSite: true,
        },
      },
      materialNeeds: {
        include: {
          material: {
            include: {
              site: true,
            },
          },
        },
      },
      assignments: {
        include: {
          user: {
            include: {
              site: true,
            },
          },
        },
      },
    },
  },
} as const;

type SitePlanWithRelations = Prisma.SitePlanGetPayload<{ include: typeof sitePlanInclude }>;

@Injectable()
export class PlanningService {
  constructor(private readonly prismaService: PrismaService) {}

  async getOne(query: GetSitePlanDto, currentUser: RequestUser): Promise<SitePlanItem> {
    if (!hasApiSectionAccess(currentUser, 'planning')) {
      throw new ForbiddenException('You are not allowed to access site planning');
    }

    const siteId = this.resolveSiteId(query.siteId, currentUser);
    const planDate = this.normalisePlanDate(query.planDate);

    let sitePlan = await this.prismaService.sitePlan.findUnique({
      where: {
        siteId_planDate: {
          siteId,
          planDate,
        },
      },
      include: sitePlanInclude,
    });

    if (!sitePlan) {
      sitePlan = await this.bootstrapPlan(siteId, planDate, currentUser.id);
    }

    return this.toSitePlanItem(sitePlan);
  }

  async upsert(query: GetSitePlanDto, dto: UpsertSitePlanDto, currentUser: RequestUser): Promise<SitePlanItem> {
    this.assertCanEdit(currentUser);

    const siteId = this.resolveSiteId(query.siteId, currentUser, true);
    const planDate = this.normalisePlanDate(dto.planDate);

    await this.assertSiteExists(siteId);
    this.assertPayloadShape(dto);
    await this.assertReferences(siteId, dto);

    const zoneCreateData = dto.zones
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((zone) => this.toZoneCreateInput(zone));

    const sitePlan = await this.prismaService.sitePlan.upsert({
      where: {
        siteId_planDate: {
          siteId,
          planDate,
        },
      },
      create: {
        siteId,
        planDate,
        status: dto.status,
        shiftStatus: dto.shiftStatus,
        briefing: dto.briefing.trim(),
        safetyNotes: dto.safetyNotes.trim(),
        updatedById: currentUser.id,
        briefings: {
          create: dto.briefings
            .slice()
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((briefing) => ({
              ...(briefing.id ? { id: briefing.id } : {}),
              category: briefing.category,
              title: briefing.title.trim(),
              note: briefing.note.trim(),
              sortOrder: briefing.sortOrder,
            })),
        },
        zones: {
          create: zoneCreateData,
        },
      },
      update: {
        status: dto.status,
        shiftStatus: dto.shiftStatus,
        briefing: dto.briefing.trim(),
        safetyNotes: dto.safetyNotes.trim(),
        updatedById: currentUser.id,
        briefings: {
          deleteMany: {},
          create: dto.briefings
            .slice()
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((briefing) => ({
              ...(briefing.id ? { id: briefing.id } : {}),
              category: briefing.category,
              title: briefing.title.trim(),
              note: briefing.note.trim(),
              sortOrder: briefing.sortOrder,
            })),
        },
        zones: {
          deleteMany: {},
          create: zoneCreateData,
        },
      },
      include: sitePlanInclude,
    });

    return this.toSitePlanItem(sitePlan);
  }

  private assertCanEdit(currentUser: RequestUser) {
    if (!canEditPlanning(currentUser)) {
      throw new ForbiddenException('You are not allowed to edit site planning');
    }
  }

  private resolveSiteId(requestedSiteId: string | undefined, currentUser: RequestUser, forEdit = false) {
    const siteId = requestedSiteId || currentUser.siteId;

    if (siteId !== currentUser.siteId && !canAccessAllSites(currentUser)) {
      throw new ForbiddenException(
        forEdit
          ? 'You can only edit planning for your assigned site'
          : 'You can only access planning for your assigned site',
      );
    }

    return siteId;
  }

  private normalisePlanDate(input?: string) {
    const parsed = input ? new Date(input) : new Date();

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid plan date');
    }

    parsed.setUTCHours(0, 0, 0, 0);
    return parsed;
  }

  private async assertSiteExists(siteId: string) {
    const site = await this.prismaService.site.findUnique({
      where: { id: siteId },
      select: { id: true },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }
  }

  private assertPayloadShape(dto: UpsertSitePlanDto) {
    if (!sitePlanStatuses.includes(dto.status)) {
      throw new BadRequestException('Unsupported site plan status');
    }

    if (!sitePlanShiftStatuses.includes(dto.shiftStatus)) {
      throw new BadRequestException('Unsupported site shift status');
    }

    const briefingSortOrders = new Set<number>();

    for (const briefing of dto.briefings) {
      if (!sitePlanBriefingCategories.includes(briefing.category)) {
        throw new BadRequestException('Unsupported briefing category');
      }

      if (briefingSortOrders.has(briefing.sortOrder)) {
        throw new BadRequestException('Briefing sort order must be unique');
      }

      briefingSortOrders.add(briefing.sortOrder);
    }

    const zoneSortOrders = new Set<number>();

    for (const zone of dto.zones) {
      if (!sitePlanPriorities.includes(zone.priority)) {
        throw new BadRequestException('Unsupported site plan priority');
      }

      if (zoneSortOrders.has(zone.sortOrder)) {
        throw new BadRequestException('Zone sort order must be unique');
      }

      zoneSortOrders.add(zone.sortOrder);

      const assignmentSortOrders = new Set<number>();
      const assignmentUsers = new Set<string>();
      const materialNeedSortOrders = new Set<number>();

      for (const assignment of zone.assignments) {
        if (assignmentSortOrders.has(assignment.sortOrder)) {
          throw new BadRequestException('Assignment sort order must be unique inside a zone');
        }

        if (assignmentUsers.has(assignment.userId)) {
          throw new BadRequestException('A user can only appear once inside a zone');
        }

        assignmentSortOrders.add(assignment.sortOrder);
        assignmentUsers.add(assignment.userId);
      }

      for (const materialNeed of zone.materialNeeds) {
        if (!sitePlanMaterialNeedStatuses.includes(materialNeed.status)) {
          throw new BadRequestException('Unsupported material need status');
        }

        if (materialNeedSortOrders.has(materialNeed.sortOrder)) {
          throw new BadRequestException('Material need sort order must be unique inside a zone');
        }

        materialNeedSortOrders.add(materialNeed.sortOrder);
      }
    }
  }

  private async assertReferences(siteId: string, dto: UpsertSitePlanDto) {
    const userIds = new Set<string>();
    const materialIds = new Set<string>();
    const truckIds = new Set<string>();
    const transportIds = new Set<string>();

    for (const zone of dto.zones) {
      if (zone.leadUserId) {
        userIds.add(zone.leadUserId);
      }

      if (zone.supportMaterialId) {
        materialIds.add(zone.supportMaterialId);
      }

      for (const materialNeed of zone.materialNeeds) {
        if (materialNeed.materialId) {
          materialIds.add(materialNeed.materialId);
        }
      }

      if (zone.supportTruckId) {
        truckIds.add(zone.supportTruckId);
      }

      if (zone.activeTransportId) {
        transportIds.add(zone.activeTransportId);
      }

      for (const assignment of zone.assignments) {
        userIds.add(assignment.userId);
      }
    }

    if (userIds.size) {
      const users = await this.prismaService.user.findMany({
        where: {
          id: { in: [...userIds] },
          siteId,
        },
        select: { id: true },
      });

      if (users.length !== userIds.size) {
        throw new BadRequestException('All planning users must belong to the selected site');
      }
    }

    if (materialIds.size) {
      const materials = await this.prismaService.material.findMany({
        where: {
          id: { in: [...materialIds] },
          siteId,
        },
        select: { id: true },
      });

      if (materials.length !== materialIds.size) {
        throw new BadRequestException('Support material must belong to the selected site');
      }
    }

    if (truckIds.size) {
      const trucks = await this.prismaService.truck.findMany({
        where: {
          id: { in: [...truckIds] },
          siteId,
        },
        select: { id: true },
      });

      if (trucks.length !== truckIds.size) {
        throw new BadRequestException('Support truck must belong to the selected site');
      }
    }

    if (transportIds.size) {
      const transports = await this.prismaService.transportRequest.findMany({
        where: {
          id: { in: [...transportIds] },
          OR: [{ fromSiteId: siteId }, { toSiteId: siteId }],
        },
        select: { id: true },
      });

      if (transports.length !== transportIds.size) {
        throw new BadRequestException('Active transport must be connected to the selected site');
      }
    }
  }

  private toZoneCreateInput(zone: SitePlanZoneDto) {
    return {
      ...(zone.id ? { id: zone.id } : {}),
      name: zone.name.trim(),
      shiftLabel: zone.shiftLabel.trim(),
      focus: zone.focus.trim(),
      supportCategory: zone.supportCategory.trim(),
      priority: zone.priority,
      sortOrder: zone.sortOrder,
      leadUserId: zone.leadUserId || null,
      supportMaterialId: zone.supportMaterialId || null,
      supportTruckId: zone.supportTruckId || null,
      activeTransportId: zone.activeTransportId || null,
      materialNeeds: {
        create: zone.materialNeeds
          .slice()
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map((materialNeed) => ({
            ...(materialNeed.id ? { id: materialNeed.id } : {}),
            materialId: materialNeed.materialId || null,
            label: materialNeed.label.trim(),
            quantity: materialNeed.quantity,
            unit: materialNeed.unit.trim(),
            status: materialNeed.status,
            notes: materialNeed.notes.trim(),
            sortOrder: materialNeed.sortOrder,
          })),
      },
      assignments: {
        create: zone.assignments
          .slice()
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map((assignment) => ({
            userId: assignment.userId,
            sortOrder: assignment.sortOrder,
          })),
      },
    };
  }

  private async bootstrapPlan(siteId: string, planDate: Date, updatedById: string): Promise<SitePlanWithRelations> {
    const site = await this.prismaService.site.findUnique({
      where: { id: siteId },
      select: { id: true, name: true },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    const dateKey = planDate.toISOString().slice(0, 10).replace(/-/g, '');

    const [users, materials, trucks, transports] = await Promise.all([
      this.prismaService.user.findMany({
        where: { siteId },
        include: { site: true },
        orderBy: { name: 'asc' },
      }),
      this.prismaService.material.findMany({
        where: {
          siteId,
          status: { not: 'picked_up' },
        },
        include: { site: true },
        orderBy: { updatedAt: 'desc' },
        take: 6,
      }),
      this.prismaService.truck.findMany({
        where: { siteId },
        include: { site: true },
        orderBy: [{ available: 'desc' }, { name: 'asc' }],
        take: 3,
      }),
      this.prismaService.transportRequest.findMany({
        where: {
          OR: [{ fromSiteId: siteId }, { toSiteId: siteId }],
          status: { in: ['planned', 'in_transit'] },
        },
        include: {
          material: {
            include: {
              site: true,
            },
          },
          truck: {
            include: {
              site: true,
            },
          },
          fromSite: true,
          toSite: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 3,
      }),
    ]);

    const sortedUsers = users.slice().sort((left, right) => {
      return roleOrder[left.role as UserRole] - roleOrder[right.role as UserRole] || left.name.localeCompare(right.name);
    });

    const leadUsers = sortedUsers.filter((user) => leadPlanningRoles.has(user.role as UserRole));
    const crewUsers = sortedUsers.filter((user) => !leadPlanningRoles.has(user.role as UserRole));

    const zones: Prisma.SitePlanZoneCreateWithoutPlanInput[] = defaultZoneBlueprints.map((blueprint, index) => {
      const assignedCrew = crewUsers.slice(index * 2, index * 2 + 2);
      const supportingMaterial = materials[index];

      return {
        id: `${siteId}-${dateKey}-zone-${index + 1}`,
        name: blueprint.name,
        shiftLabel: blueprint.shiftLabel,
        focus: blueprint.focus,
        supportCategory: supportingMaterial?.category ?? blueprint.supportCategory,
        priority: blueprint.priority,
        sortOrder: index,
        leadUserId: leadUsers[index % Math.max(leadUsers.length, 1)]?.id ?? null,
        supportMaterialId: supportingMaterial?.id ?? null,
        supportTruckId: trucks[index]?.id ?? null,
        activeTransportId: transports[index]?.id ?? null,
        materialNeeds: {
          create: [
            {
              id: `${siteId}-${dateKey}-need-${index + 1}`,
              materialId: supportingMaterial?.id ?? null,
              label: supportingMaterial?.title ?? `${blueprint.supportCategory} Reserve`,
              quantity: supportingMaterial?.quantity ? Math.max(1, Math.min(supportingMaterial.quantity, 12)) : 1,
              unit: supportingMaterial ? 'units' : 'lot',
              status: supportingMaterial ? 'ready' : 'needed',
              notes: `Bereitstellung fur ${blueprint.name}`,
              sortOrder: 0,
            },
          ],
        },
        assignments: {
          create: assignedCrew.map((user, assignmentIndex) => ({
            userId: user.id,
            sortOrder: assignmentIndex,
          })),
        },
      };
    });

    return this.prismaService.sitePlan.create({
      data: {
        siteId,
        planDate,
        status: 'draft',
        shiftStatus: 'ready',
        briefing: `Automatisch erzeugter Tagesplan fur ${site.name}.`,
        safetyNotes: 'Zugang, Kranfenster, PSA und Rettungswege vor Schichtstart freigeben.',
        updatedById,
        briefings: {
          create: [
            {
              id: `${siteId}-${dateKey}-briefing-operations`,
              category: 'operations',
              title: 'Tagesauftakt',
              note: `Tagesplan fur ${site.name} vor Schichtstart mit allen Vorarbeitern abstimmen.`,
              sortOrder: 0,
            },
            {
              id: `${siteId}-${dateKey}-briefing-safety`,
              category: 'safety',
              title: 'Sicherheitscheck',
              note: 'PSA, Sperrzonen und Rettungswege vor Arbeitsbeginn kontrollieren.',
              sortOrder: 1,
            },
            {
              id: `${siteId}-${dateKey}-briefing-logistics`,
              category: 'logistics',
              title: 'Logistikfenster',
              note: 'Entladung, Kranfenster und Nachschubslot vor 07:00 fixieren.',
              sortOrder: 2,
            },
          ],
        },
        zones: {
          create: zones,
        },
      },
      include: sitePlanInclude,
    });
  }

  private toSitePlanItem(sitePlan: SitePlanWithRelations): SitePlanItem {
    return {
      id: sitePlan.id,
      siteId: sitePlan.siteId,
      site: this.toSiteSummary(sitePlan.site),
      planDate: sitePlan.planDate.toISOString(),
      status: sitePlan.status,
      shiftStatus: sitePlan.shiftStatus,
      briefing: sitePlan.briefing,
      safetyNotes: sitePlan.safetyNotes,
      briefings: sitePlan.briefings
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((briefing) => ({
          id: briefing.id,
          category: briefing.category,
          title: briefing.title,
          note: briefing.note,
          sortOrder: briefing.sortOrder,
        })),
      updatedById: sitePlan.updatedById,
      updatedBy: sitePlan.updatedBy ? this.toAuthUser(sitePlan.updatedBy) : null,
      createdAt: sitePlan.createdAt.toISOString(),
      updatedAt: sitePlan.updatedAt.toISOString(),
      zones: sitePlan.zones
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((zone) => ({
          id: zone.id,
          name: zone.name,
          shiftLabel: zone.shiftLabel,
          focus: zone.focus,
          supportCategory: zone.supportCategory,
          priority: zone.priority,
          sortOrder: zone.sortOrder,
          leadUserId: zone.leadUserId,
          leadUser: zone.leadUser ? this.toAuthUser(zone.leadUser) : null,
          supportMaterialId: zone.supportMaterialId,
          supportMaterial: zone.supportMaterial ? this.toMaterialItem(zone.supportMaterial) : null,
          supportTruckId: zone.supportTruckId,
          supportTruck: zone.supportTruck ? this.toTruckItem(zone.supportTruck) : null,
          activeTransportId: zone.activeTransportId,
          activeTransport: zone.activeTransport ? this.toTransportItem(zone.activeTransport) : null,
          materialNeeds: zone.materialNeeds
            .slice()
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((materialNeed) => ({
              id: materialNeed.id,
              materialId: materialNeed.materialId,
              material: materialNeed.material ? this.toMaterialItem(materialNeed.material) : null,
              label: materialNeed.label,
              quantity: materialNeed.quantity,
              unit: materialNeed.unit,
              status: materialNeed.status,
              notes: materialNeed.notes,
              sortOrder: materialNeed.sortOrder,
            })),
          assignments: zone.assignments
            .slice()
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((assignment) => ({
              id: assignment.id,
              userId: assignment.userId,
              sortOrder: assignment.sortOrder,
              user: this.toAuthUser(assignment.user),
            })),
        })),
    };
  }

  private toSiteSummary(site: { id: string; name: string; latitude: number; longitude: number }) {
    return {
      id: site.id,
      name: site.name,
      latitude: site.latitude,
      longitude: site.longitude,
    };
  }

  private toAuthUser(user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    siteId: string;
    site?: { id: string; name: string; latitude: number; longitude: number } | null;
  }): AuthUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      siteId: user.siteId,
      site: user.site ? this.toSiteSummary(user.site) : undefined,
    };
  }

  private toMaterialItem(material: {
    id: string;
    title: string;
    description: string;
    category: string;
    quantity: number;
    condition: MaterialItem['condition'];
    imageUrl: string;
    latitude: number;
    longitude: number;
    siteId: string;
    status: MaterialItem['status'];
    suggestedCategory: string | null;
    reservedById: string | null;
    createdAt: Date;
    updatedAt: Date;
    site?: { id: string; name: string; latitude: number; longitude: number } | null;
  }): MaterialItem {
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
      site: material.site ? this.toSiteSummary(material.site) : undefined,
      status: material.status,
      distanceKm: 0,
      suggestedCategory: material.suggestedCategory,
      reservedById: material.reservedById,
      createdAt: material.createdAt.toISOString(),
      updatedAt: material.updatedAt.toISOString(),
    };
  }

  private toTruckItem(truck: {
    id: string;
    name: string;
    licensePlate: string;
    siteId: string;
    available: boolean;
    site?: { id: string; name: string; latitude: number; longitude: number } | null;
  }): TruckItem {
    return {
      id: truck.id,
      name: truck.name,
      licensePlate: truck.licensePlate,
      siteId: truck.siteId,
      available: truck.available,
      site: truck.site ? this.toSiteSummary(truck.site) : undefined,
    };
  }

  private toTransportItem(transport: {
    id: string;
    materialId: string;
    fromSiteId: string;
    toSiteId: string;
    truckId: string;
    status: TransportRequestItem['status'];
    createdAt: Date;
    updatedAt: Date;
    material: Parameters<PlanningService['toMaterialItem']>[0];
    truck: Parameters<PlanningService['toTruckItem']>[0];
    fromSite: { id: string; name: string; latitude: number; longitude: number };
    toSite: { id: string; name: string; latitude: number; longitude: number };
  }): TransportRequestItem {
    return {
      id: transport.id,
      materialId: transport.materialId,
      fromSiteId: transport.fromSiteId,
      toSiteId: transport.toSiteId,
      truckId: transport.truckId,
      status: transport.status,
      createdAt: transport.createdAt.toISOString(),
      updatedAt: transport.updatedAt.toISOString(),
      material: this.toMaterialItem(transport.material),
      truck: this.toTruckItem(transport.truck),
      fromSite: this.toSiteSummary(transport.fromSite),
      toSite: this.toSiteSummary(transport.toSite),
    };
  }
}