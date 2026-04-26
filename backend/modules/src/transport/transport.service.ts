import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { hash } from 'bcryptjs';
import { randomInt, randomUUID } from 'crypto';
import type { DriverLoadingScanPayload, DriverUnloadingScanPayload, MaterialItem, TransportRequestItem } from '@matflow/shared-types';
import { assertApiSectionAccess, assertSiteVisibility, canAccessAllSites, isTransportVisibleForUser } from '../common/access-control';
import type { RequestUser } from '../common/request-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateTransportRequestDto } from './dto/create-transport-request.dto';
import { UpdateTransportStatusDto } from './dto/update-transport-status.dto';

interface TransportWithRelations {
  id: string;
  materialId: string;
  fromSiteId: string;
  toSiteId: string;
  truckId: string;
  status: 'planned' | 'in_transit' | 'delivered';
  driverName?: string | null;
  driverCompany?: string | null;
  loadingQrToken?: string | null;
  unloadingQrToken?: string | null;
  loadedAt?: Date | null;
  unloadingScannedAt?: Date | null;
  loadingSignaturePath?: string | null;
  loadingSignedBy?: string | null;
  loadingSignedAt?: Date | null;
  deliveryNotePath?: string | null;
  createdAt: Date;
  updatedAt: Date;
  material: {
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
  };
  truck: {
    id: string;
    name: string;
    licensePlate: string;
    siteId: string;
    available: boolean;
    site?: {
      id: string;
      name: string;
      latitude: number;
      longitude: number;
    };
  };
  fromSite: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
  toSite: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
}

function createDriverAccessCode() {
  return String(randomInt(100000, 999999));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

@Injectable()
export class TransportService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly storageService: StorageService,
  ) {}

  async list(status: 'planned' | 'in_transit' | 'delivered' | undefined, currentUser: RequestUser): Promise<TransportRequestItem[]> {
    const transportRequests = await this.prismaService.transportRequest.findMany({
      where: {
        status: status || undefined,
        ...(canAccessAllSites(currentUser)
          ? {}
          : {
              OR: [{ fromSiteId: currentUser.siteId }, { toSiteId: currentUser.siteId }],
            }),
      },
      include: {
        material: true,
        truck: {
          include: {
            site: true,
          },
        },
        fromSite: true,
        toSite: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });

    return transportRequests.map((transportRequest) => this.toTransportItem(transportRequest as unknown as TransportWithRelations));
  }

  async create(dto: CreateTransportRequestDto, currentUser: RequestUser): Promise<TransportRequestItem> {
    assertApiSectionAccess(currentUser, 'transport', 'You are not allowed to create transport requests');

    const material = await this.prismaService.material.findUnique({ where: { id: dto.materialId } });
    if (!material) {
      throw new NotFoundException('Material not found');
    }

    assertSiteVisibility(currentUser, material.siteId, 'You can only plan transport from your assigned site');

    const truck = await this.prismaService.truck.findUnique({ where: { id: dto.truckId } });
    if (!truck) {
      throw new NotFoundException('Truck not found');
    }

    assertSiteVisibility(currentUser, truck.siteId, 'You can only dispatch trucks from your assigned site');

    if (!truck.available) {
      throw new BadRequestException('Truck is not available');
    }

    if (material.status === 'picked_up') {
      throw new BadRequestException('Picked up material can no longer be transported');
    }

    const activeTransport = await this.prismaService.transportRequest.findFirst({
      where: {
        materialId: dto.materialId,
        status: { in: ['planned', 'in_transit'] },
      },
    });

    if (activeTransport) {
      throw new BadRequestException('Material already has an active transport request');
    }

    const driverAccessCode = createDriverAccessCode();
    const driverAccessCodeHash = await hash(driverAccessCode, 10);
    const loadingQrToken = randomUUID();
    const unloadingQrToken = randomUUID();

    const transportRequest = await this.prismaService.$transaction(async (transaction) => {
      await transaction.truck.update({
        where: { id: dto.truckId },
        data: { available: false },
      });

      await transaction.material.update({
        where: { id: dto.materialId },
        data: {
          status: 'reserved',
          reservedById: currentUser.id,
        },
      });

      return transaction.transportRequest.create({
        data: {
          materialId: dto.materialId,
          fromSiteId: material.siteId,
          toSiteId: dto.toSiteId,
          truckId: dto.truckId,
          status: 'planned',
          driverAccessCodeHash,
          loadingQrToken,
          unloadingQrToken,
        },
        include: {
          material: true,
          truck: {
            include: {
              site: true,
            },
          },
          fromSite: true,
          toSite: true,
        },
      });
    });

    this.eventEmitter.emit('transport.created', {
      type: 'transport.created',
      entityType: 'transport',
      entityId: transportRequest.id,
      message: `Transport for ${transportRequest.material.title} was planned by ${currentUser.name}.`,
      payload: {
        truckId: transportRequest.truckId,
        fromSiteId: transportRequest.fromSiteId,
        toSiteId: transportRequest.toSiteId,
        materialTitle: transportRequest.material.title,
        actorName: currentUser.name,
        transportId: transportRequest.id,
      },
    });

    return this.toTransportItem(transportRequest as unknown as TransportWithRelations, { driverAccessCode });
  }

  async updateStatus(id: string, dto: UpdateTransportStatusDto, currentUser: RequestUser): Promise<TransportRequestItem> {
    const existingTransportRequest = await this.prismaService.transportRequest.findUnique({
      where: { id },
      include: {
        material: true,
        truck: {
          include: {
            site: true,
          },
        },
        fromSite: true,
        toSite: true,
      },
    });

    if (!existingTransportRequest) {
      throw new NotFoundException('Transport request not found');
    }

    assertApiSectionAccess(currentUser, 'transport', 'You are not allowed to update transport status');

    if (!isTransportVisibleForUser(currentUser, existingTransportRequest.fromSiteId, existingTransportRequest.toSiteId)) {
      throw new NotFoundException('Transport request not found');
    }

    const transportRequest = await this.prismaService.$transaction(async (transaction) => {
      if (dto.status === 'delivered') {
        await transaction.truck.update({
          where: { id: existingTransportRequest.truckId },
          data: { available: true },
        });

        await transaction.material.update({
          where: { id: existingTransportRequest.materialId },
          data: { status: 'picked_up' },
        });
      }

      if (dto.status === 'planned' || dto.status === 'in_transit') {
        await transaction.material.update({
          where: { id: existingTransportRequest.materialId },
          data: { status: 'reserved' },
        });
      }

      return transaction.transportRequest.update({
        where: { id },
        data: { status: dto.status },
        include: {
          material: true,
          truck: {
            include: {
              site: true,
            },
          },
          fromSite: true,
          toSite: true,
        },
      });
    });

    this.eventEmitter.emit('transport.status.changed', {
      type: 'transport.status.changed',
      entityType: 'transport',
      entityId: transportRequest.id,
      message: `Transport ${transportRequest.id} is now ${transportRequest.status}.`,
      payload: {
        previousStatus: existingTransportRequest.status,
        currentStatus: transportRequest.status,
        updatedBy: currentUser.id,
        actorName: currentUser.name,
        transportId: transportRequest.id,
      },
    });

    return this.toTransportItem(transportRequest as unknown as TransportWithRelations);
  }

  async getDriverCurrent(currentUser: RequestUser): Promise<TransportRequestItem> {
    const transportRequest = await this.getTransportForDriver(currentUser, currentUser.transportId);
    return this.toTransportItem(transportRequest);
  }

  async confirmDriverLoading(id: string, dto: DriverLoadingScanPayload, currentUser: RequestUser): Promise<TransportRequestItem> {
    const existingTransportRequest = await this.getTransportForDriver(currentUser, id);

    if (!existingTransportRequest.loadingQrToken || existingTransportRequest.loadingQrToken !== dto.qrToken) {
      throw new BadRequestException('Invalid loading QR code');
    }

    if (existingTransportRequest.loadingSignedAt || existingTransportRequest.loadedAt) {
      throw new BadRequestException('Loading has already been confirmed');
    }

    const now = new Date();
    const signaturePath = await this.storageService.saveDriverSignature(existingTransportRequest.fromSiteId, existingTransportRequest.id, dto.signatureSvg);

    const transportRequest = await this.prismaService.$transaction(async (transaction) => {
      await transaction.material.update({
        where: { id: existingTransportRequest.materialId },
        data: { status: 'reserved' },
      });

      return transaction.transportRequest.update({
        where: { id: existingTransportRequest.id },
        data: {
          status: 'in_transit',
          loadedAt: now,
          loadingSignedBy: dto.signedBy,
          loadingSignedAt: now,
          loadingSignaturePath: signaturePath,
        },
        include: {
          material: true,
          truck: {
            include: {
              site: true,
            },
          },
          fromSite: true,
          toSite: true,
        },
      });
    });

    this.eventEmitter.emit('transport.status.changed', {
      type: 'transport.status.changed',
      entityType: 'transport',
      entityId: transportRequest.id,
      message: `Transport ${transportRequest.id} is now ${transportRequest.status}.`,
      payload: {
        previousStatus: existingTransportRequest.status,
        currentStatus: transportRequest.status,
        updatedBy: currentUser.id,
        actorName: dto.signedBy,
        transportId: transportRequest.id,
      },
    });

    return this.toTransportItem(transportRequest as unknown as TransportWithRelations);
  }

  async confirmDriverUnloading(id: string, dto: DriverUnloadingScanPayload, currentUser: RequestUser): Promise<TransportRequestItem> {
    const existingTransportRequest = await this.getTransportForDriver(currentUser, id);

    if (!existingTransportRequest.unloadingQrToken || existingTransportRequest.unloadingQrToken !== dto.qrToken) {
      throw new BadRequestException('Invalid unloading QR code');
    }

    if (!existingTransportRequest.loadedAt || !existingTransportRequest.loadingSignedAt) {
      throw new BadRequestException('Loading must be confirmed before unloading');
    }

    if (existingTransportRequest.unloadingScannedAt || existingTransportRequest.status === 'delivered') {
      throw new BadRequestException('Unloading has already been confirmed');
    }

    const unloadingScannedAt = new Date();
    const deliveryNotePath = await this.storageService.saveDeliveryNote({
      siteId: existingTransportRequest.toSiteId,
      transportId: existingTransportRequest.id,
      noteNumber: `${existingTransportRequest.id}-${unloadingScannedAt.toISOString().slice(0, 10)}`,
      html: this.renderDeliveryNoteHtml(existingTransportRequest, unloadingScannedAt),
      json: JSON.stringify(this.renderDeliveryNoteJson(existingTransportRequest, unloadingScannedAt), null, 2),
    });

    const transportRequest = await this.prismaService.$transaction(async (transaction) => {
      await transaction.truck.update({
        where: { id: existingTransportRequest.truckId },
        data: { available: true },
      });

      await transaction.material.update({
        where: { id: existingTransportRequest.materialId },
        data: { status: 'picked_up' },
      });

      return transaction.transportRequest.update({
        where: { id: existingTransportRequest.id },
        data: {
          status: 'delivered',
          unloadingScannedAt,
          deliveryNotePath,
        },
        include: {
          material: true,
          truck: {
            include: {
              site: true,
            },
          },
          fromSite: true,
          toSite: true,
        },
      });
    });

    this.eventEmitter.emit('transport.status.changed', {
      type: 'transport.status.changed',
      entityType: 'transport',
      entityId: transportRequest.id,
      message: `Transport ${transportRequest.id} is now ${transportRequest.status}.`,
      payload: {
        previousStatus: existingTransportRequest.status,
        currentStatus: transportRequest.status,
        updatedBy: currentUser.id,
        actorName: currentUser.name,
        transportId: transportRequest.id,
      },
    });

    return this.toTransportItem(transportRequest as unknown as TransportWithRelations);
  }

  toTransportItem(transportRequest: TransportWithRelations, options: { driverAccessCode?: string } = {}): TransportRequestItem {
    return {
      id: transportRequest.id,
      materialId: transportRequest.materialId,
      fromSiteId: transportRequest.fromSiteId,
      toSiteId: transportRequest.toSiteId,
      truckId: transportRequest.truckId,
      status: transportRequest.status,
      createdAt: transportRequest.createdAt.toISOString(),
      updatedAt: transportRequest.updatedAt.toISOString(),
      material: this.toMaterialItem(transportRequest.material),
      truck: {
        id: transportRequest.truck.id,
        name: transportRequest.truck.name,
        licensePlate: transportRequest.truck.licensePlate,
        siteId: transportRequest.truck.siteId,
        available: transportRequest.truck.available,
        site: transportRequest.truck.site,
      },
      fromSite: transportRequest.fromSite,
      toSite: transportRequest.toSite,
      driverAccess: {
        loginPlate: transportRequest.truck.licensePlate,
        accessCode: options.driverAccessCode ?? null,
        driverName: transportRequest.driverName ?? null,
        driverCompany: transportRequest.driverCompany ?? null,
        loadingQrToken: transportRequest.loadingQrToken ?? null,
        unloadingQrToken: transportRequest.unloadingQrToken ?? null,
        loadingScannedAt: transportRequest.loadedAt?.toISOString() ?? null,
        unloadingScannedAt: transportRequest.unloadingScannedAt?.toISOString() ?? null,
        loadingSignedAt: transportRequest.loadingSignedAt?.toISOString() ?? null,
        loadingSignedBy: transportRequest.loadingSignedBy ?? null,
        loadingSignaturePath: transportRequest.loadingSignaturePath ?? null,
        deliveryNotePath: transportRequest.deliveryNotePath ?? null,
      },
    };
  }

  private toMaterialItem(material: TransportWithRelations['material']): MaterialItem {
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
      status: material.status,
      distanceKm: 0,
      suggestedCategory: material.suggestedCategory,
      reservedById: material.reservedById,
      createdAt: material.createdAt.toISOString(),
      updatedAt: material.updatedAt.toISOString(),
    };
  }

  private async getTransportForDriver(currentUser: RequestUser, transportId?: string): Promise<TransportWithRelations> {
    if (currentUser.authMode !== 'driver-pass' || !currentUser.transportId || !transportId || currentUser.transportId !== transportId) {
      throw new ForbiddenException('Driver access is only valid for the assigned transport');
    }

    const transportRequest = await this.prismaService.transportRequest.findUnique({
      where: { id: transportId },
      include: {
        material: true,
        truck: {
          include: {
            site: true,
          },
        },
        fromSite: true,
        toSite: true,
      },
    });

    if (!transportRequest) {
      throw new NotFoundException('Transport request not found');
    }

    return transportRequest as unknown as TransportWithRelations;
  }

  private renderDeliveryNoteJson(transportRequest: TransportWithRelations, unloadingScannedAt: Date) {
    return {
      noteType: 'delivery-note',
      noteNumber: `${transportRequest.id}-${unloadingScannedAt.toISOString().slice(0, 10)}`,
      createdAt: unloadingScannedAt.toISOString(),
      transportId: transportRequest.id,
      status: 'delivered',
      driver: {
        name: transportRequest.driverName || transportRequest.truck.name,
        company: transportRequest.driverCompany || null,
        licensePlate: transportRequest.truck.licensePlate,
        signedBy: transportRequest.loadingSignedBy || null,
        signedAt: transportRequest.loadingSignedAt?.toISOString() || null,
        signaturePath: transportRequest.loadingSignaturePath || null,
      },
      route: {
        loadingSite: transportRequest.fromSite,
        unloadingSite: transportRequest.toSite,
        loadedAt: transportRequest.loadedAt?.toISOString() || null,
        unloadedAt: unloadingScannedAt.toISOString(),
      },
      cargo: {
        materialId: transportRequest.material.id,
        title: transportRequest.material.title,
        category: transportRequest.material.category,
        quantity: transportRequest.material.quantity,
        condition: transportRequest.material.condition,
      },
      truck: {
        id: transportRequest.truck.id,
        name: transportRequest.truck.name,
        licensePlate: transportRequest.truck.licensePlate,
      },
    };
  }

  private renderDeliveryNoteHtml(transportRequest: TransportWithRelations, unloadingScannedAt: Date): string {
    const note = this.renderDeliveryNoteJson(transportRequest, unloadingScannedAt);

    return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <title>Lieferschein ${escapeHtml(note.noteNumber)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
      h1, h2 { margin: 0 0 12px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px; }
      .card { border: 1px solid #d1d5db; border-radius: 12px; padding: 16px; }
      dt { font-weight: 700; }
      dd { margin: 0 0 8px; }
    </style>
  </head>
  <body>
    <h1>Lieferschein</h1>
    <p>Nummer: ${escapeHtml(note.noteNumber)}</p>
    <p>Erstellt: ${escapeHtml(note.createdAt)}</p>
    <div class="grid">
      <section class="card">
        <h2>Fahrer</h2>
        <dl>
          <dt>Name</dt><dd>${escapeHtml(note.driver.name)}</dd>
          <dt>Firma</dt><dd>${escapeHtml(note.driver.company || '-')}</dd>
          <dt>Kennzeichen</dt><dd>${escapeHtml(note.driver.licensePlate)}</dd>
          <dt>Unterschrieben von</dt><dd>${escapeHtml(note.driver.signedBy || '-')}</dd>
          <dt>Signiert am</dt><dd>${escapeHtml(note.driver.signedAt || '-')}</dd>
        </dl>
      </section>
      <section class="card">
        <h2>Transport</h2>
        <dl>
          <dt>Transport-ID</dt><dd>${escapeHtml(note.transportId)}</dd>
          <dt>Ladestelle</dt><dd>${escapeHtml(note.route.loadingSite.name)}</dd>
          <dt>Abladestelle</dt><dd>${escapeHtml(note.route.unloadingSite.name)}</dd>
          <dt>Beladen</dt><dd>${escapeHtml(note.route.loadedAt || '-')}</dd>
          <dt>Abgeladen</dt><dd>${escapeHtml(note.route.unloadedAt)}</dd>
        </dl>
      </section>
      <section class="card">
        <h2>Ladung</h2>
        <dl>
          <dt>Material</dt><dd>${escapeHtml(note.cargo.title)}</dd>
          <dt>Kategorie</dt><dd>${escapeHtml(note.cargo.category)}</dd>
          <dt>Menge</dt><dd>${escapeHtml(String(note.cargo.quantity))}</dd>
          <dt>Zustand</dt><dd>${escapeHtml(note.cargo.condition)}</dd>
        </dl>
      </section>
      <section class="card">
        <h2>Fahrzeug</h2>
        <dl>
          <dt>LKW</dt><dd>${escapeHtml(note.truck.name)}</dd>
          <dt>Kennzeichen</dt><dd>${escapeHtml(note.truck.licensePlate)}</dd>
        </dl>
        ${note.driver.signaturePath ? `<p><strong>Signaturdatei:</strong> ${escapeHtml(note.driver.signaturePath)}</p>` : ''}
      </section>
    </div>
  </body>
</html>`;
  }
}
