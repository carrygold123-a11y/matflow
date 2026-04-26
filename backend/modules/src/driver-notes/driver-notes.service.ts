import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { DriverNoteItem } from '@matflow/shared-types';
import type { RequestUser } from '../common/request-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateDriverNoteDto } from './dto/create-driver-note.dto';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

@Injectable()
export class DriverNotesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateDriverNoteDto, currentUser: RequestUser): Promise<DriverNoteItem> {
    if (currentUser.authMode !== 'driver-pass') {
      throw new UnauthorizedException('Only drivers can create driver notes');
    }

    const [fromSite, toSite] = await Promise.all([
      this.prismaService.site.findUnique({ where: { id: dto.fromSiteId } }),
      this.prismaService.site.findUnique({ where: { id: dto.toSiteId } }),
    ]);

    if (!fromSite) throw new NotFoundException('Ladebaustelle nicht gefunden');
    if (!toSite) throw new NotFoundException('Abladebaustelle nicht gefunden');

    const licensePlate = currentUser.licensePlate ?? dto.driverName;

    const note = await this.prismaService.driverNote.create({
      data: {
        licensePlate: licensePlate || 'UNBEKANNT',
        vehicleType: dto.vehicleType,
        driverName: dto.driverName || '',
        fromSiteId: dto.fromSiteId,
        toSiteId: dto.toSiteId,
        signedAt: new Date(),
      },
      include: { fromSite: true, toSite: true },
    });

    let signaturePath: string | null = null;
    let deliveryNotePath: string | null = null;

    try {
      signaturePath = await this.storageService.saveDriverNoteSignature(note.id, dto.signatureSvg);
      const html = this.renderDeliveryNoteHtml(note, signaturePath);
      deliveryNotePath = await this.storageService.saveDriverNoteDelivery(note.id, html);
    } catch (error) {
      throw new BadRequestException(`Signature or delivery note could not be saved: ${String(error)}`);
    }

    const updatedNote = await this.prismaService.driverNote.update({
      where: { id: note.id },
      data: { signaturePath, deliveryNotePath },
      include: { fromSite: true, toSite: true },
    });

    // Notify Polier at destination site
    this.eventEmitter.emit('driver-note.created', {
      type: 'driver-note.created',
      entityType: 'driver-note',
      entityId: updatedNote.id,
      message: `Lieferschein von ${escapeHtml(updatedNote.licensePlate)} (${escapeHtml(updatedNote.vehicleType)}) eingetroffen: ${fromSite.name} → ${toSite.name}`,
      payload: {
        noteId: updatedNote.id,
        licensePlate: updatedNote.licensePlate,
        vehicleType: updatedNote.vehicleType,
        driverName: updatedNote.driverName,
        fromSiteName: fromSite.name,
        toSiteName: toSite.name,
        toSiteId: toSite.id,
        deliveryNotePath: updatedNote.deliveryNotePath,
      },
    });

    return this.toItem(updatedNote);
  }

  private toItem(note: {
    id: string;
    licensePlate: string;
    vehicleType: string;
    driverName: string;
    fromSiteId: string;
    toSiteId: string;
    signedAt: Date | null;
    deliveryNotePath: string | null;
    createdAt: Date;
    fromSite: { id: string; name: string; latitude: number; longitude: number };
    toSite: { id: string; name: string; latitude: number; longitude: number };
  }): DriverNoteItem {
    return {
      id: note.id,
      licensePlate: note.licensePlate,
      vehicleType: note.vehicleType,
      driverName: note.driverName,
      fromSiteId: note.fromSiteId,
      toSiteId: note.toSiteId,
      fromSite: { id: note.fromSite.id, name: note.fromSite.name },
      toSite: { id: note.toSite.id, name: note.toSite.name },
      signedAt: note.signedAt?.toISOString() ?? null,
      deliveryNotePath: note.deliveryNotePath ?? null,
      createdAt: note.createdAt.toISOString(),
    };
  }

  private renderDeliveryNoteHtml(
    note: { id: string; licensePlate: string; vehicleType: string; driverName: string; signedAt: Date | null; fromSite: { name: string }; toSite: { name: string } },
    signaturePath: string | null,
  ): string {
    const noteNumber = `LS-${note.id.slice(-8).toUpperCase()}-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}`;
    const createdAt = note.signedAt ? note.signedAt.toLocaleString('de-DE') : new Date().toLocaleString('de-DE');

    return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <title>Lieferschein ${escapeHtml(noteNumber)}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; margin: 0; padding: 32px; color: #111827; background: #fff; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #F5BF18; padding-bottom: 16px; }
      .brand { font-size: 28px; font-weight: 900; color: #0f172a; letter-spacing: -1px; }
      .brand span { color: #F5BF18; }
      .note-meta { text-align: right; color: #64748b; font-size: 13px; }
      .note-meta strong { display: block; font-size: 18px; color: #0f172a; font-weight: 800; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
      .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; }
      .card h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin: 0 0 12px; }
      .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
      .row .label { color: #64748b; }
      .row .value { font-weight: 600; text-align: right; max-width: 60%; }
      .route { background: #0f172a; color: #f1f5f9; border-radius: 12px; padding: 18px 24px; margin-bottom: 24px; display: flex; align-items: center; gap: 24px; }
      .route .site { flex: 1; }
      .route .site-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 4px; }
      .route .site-name { font-size: 18px; font-weight: 800; }
      .route .arrow { font-size: 24px; color: #F5BF18; }
      .sig-box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
      .sig-box h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin: 0 0 12px; }
      .sig-box img { max-width: 100%; height: auto; border: 1px solid #f1f5f9; border-radius: 8px; }
      .footer { font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="brand">BAU<span>FLOW</span></div>
      <div class="note-meta">
        <strong>Lieferschein</strong>
        Nr. ${escapeHtml(noteNumber)}<br>
        Erstellt: ${escapeHtml(createdAt)}
      </div>
    </div>

    <div class="route">
      <div class="site">
        <div class="site-label">Ladebaustelle</div>
        <div class="site-name">${escapeHtml(note.fromSite.name)}</div>
      </div>
      <div class="arrow">→</div>
      <div class="site">
        <div class="site-label">Abladebaustelle</div>
        <div class="site-name">${escapeHtml(note.toSite.name)}</div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <h2>Fahrzeug</h2>
        <div class="row"><span class="label">Kennzeichen</span><span class="value">${escapeHtml(note.licensePlate)}</span></div>
        <div class="row"><span class="label">Fahrzeugtyp</span><span class="value">${escapeHtml(note.vehicleType)}</span></div>
      </div>
      <div class="card">
        <h2>Fahrer</h2>
        <div class="row"><span class="label">Name</span><span class="value">${escapeHtml(note.driverName || '-')}</span></div>
        <div class="row"><span class="label">Signiert am</span><span class="value">${escapeHtml(createdAt)}</span></div>
      </div>
    </div>

    ${signaturePath ? `<div class="sig-box"><h2>Unterschrift Fahrer</h2><img src="${escapeHtml(signaturePath)}" alt="Unterschrift" /></div>` : ''}

    <div class="footer">BauFlow · Automatisch generierter Lieferschein · ${escapeHtml(noteNumber)}</div>
  </body>
</html>`;
  }
}
