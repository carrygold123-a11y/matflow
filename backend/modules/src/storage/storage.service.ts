import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ensureDir, writeFile } from 'fs-extra';
import { randomUUID } from 'crypto';
import { extname, join, resolve } from 'path';
import sharp from 'sharp';
import type { UploadedFile } from './uploaded-file.interface';

@Injectable()
export class StorageService {
  private readonly driver: string;
  private readonly storageRoot: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.driver = this.configService.get<string>('STORAGE_DRIVER', 'local');
    this.storageRoot = resolve(this.configService.get<string>('STORAGE_PATH', resolve(process.cwd(), '../../storage')));
    this.publicBaseUrl = this.configService.get<string>('STORAGE_PUBLIC_BASE_URL', '');
  }

  async saveMaterialImage(file: UploadedFile): Promise<string> {
    if (this.driver !== 'local') {
      throw new BadRequestException(`Unsupported storage driver: ${this.driver}`);
    }

    const fileName = `${randomUUID()}${this.resolveExtension(file.originalname)}`;
    const relativeDirectory = join('materials');
    const absoluteDirectory = join(this.storageRoot, relativeDirectory);
    const absolutePath = join(absoluteDirectory, fileName);

    await ensureDir(absoluteDirectory);

    const buffer = await sharp(file.buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    await writeFile(absolutePath, buffer);

    const relativePath = `/storage/${relativeDirectory.replaceAll('\\', '/')}/${fileName}`;
    return this.publicBaseUrl ? `${this.publicBaseUrl}${relativePath}` : relativePath;
  }

  async saveDriverSignature(siteId: string, transportId: string, signatureSvg: string): Promise<string> {
    if (this.driver !== 'local') {
      throw new BadRequestException(`Unsupported storage driver: ${this.driver}`);
    }

    const sanitizedSvg = this.sanitizeSignatureSvg(signatureSvg);
    const relativeDirectory = join('sites', siteId, 'driver-signatures');
    const fileName = `${transportId}-${randomUUID()}.svg`;
    const absoluteDirectory = join(this.storageRoot, relativeDirectory);
    const absolutePath = join(absoluteDirectory, fileName);

    await ensureDir(absoluteDirectory);
    await writeFile(absolutePath, sanitizedSvg, 'utf8');

    return this.toPublicStoragePath(relativeDirectory, fileName);
  }

  async saveDeliveryNote(options: {
    siteId: string;
    transportId: string;
    noteNumber: string;
    html: string;
    json: string;
  }): Promise<string> {
    if (this.driver !== 'local') {
      throw new BadRequestException(`Unsupported storage driver: ${this.driver}`);
    }

    const relativeDirectory = join('sites', options.siteId, 'lieferscheine');
    const absoluteDirectory = join(this.storageRoot, relativeDirectory);
    const htmlFileName = `${options.noteNumber}.html`;
    const jsonFileName = `${options.noteNumber}.json`;

    await ensureDir(absoluteDirectory);
    await writeFile(join(absoluteDirectory, htmlFileName), options.html, 'utf8');
    await writeFile(join(absoluteDirectory, jsonFileName), options.json, 'utf8');

    return this.toPublicStoragePath(relativeDirectory, htmlFileName);
  }

  private sanitizeSignatureSvg(signatureSvg: string): string {
    const trimmedSvg = signatureSvg.trim();

    if (!trimmedSvg.startsWith('<svg') || !trimmedSvg.endsWith('</svg>')) {
      throw new BadRequestException('Signature must be provided as an SVG document');
    }

    const blockedPatterns = [/<script/i, /foreignObject/i, /<iframe/i, /onload\s*=/i, /onerror\s*=/i, /xlink:href\s*=/i, /href\s*=\s*['"]\s*javascript:/i];
    if (blockedPatterns.some((pattern) => pattern.test(trimmedSvg))) {
      throw new BadRequestException('Signature SVG contains unsupported markup');
    }

    return trimmedSvg;
  }

  async saveDriverNoteSignature(noteId: string, signatureSvg: string): Promise<string> {
    if (this.driver !== 'local') {
      throw new BadRequestException(`Unsupported storage driver: ${this.driver}`);
    }

    const sanitizedSvg = this.sanitizeSignatureSvg(signatureSvg);
    const relativeDirectory = join('driver-notes', noteId);
    const fileName = `signature-${randomUUID()}.svg`;
    const absoluteDirectory = join(this.storageRoot, relativeDirectory);
    const absolutePath = join(absoluteDirectory, fileName);

    await ensureDir(absoluteDirectory);
    await writeFile(absolutePath, sanitizedSvg, 'utf8');

    return this.toPublicStoragePath(relativeDirectory, fileName);
  }

  async saveDriverNoteDelivery(noteId: string, html: string): Promise<string> {
    if (this.driver !== 'local') {
      throw new BadRequestException(`Unsupported storage driver: ${this.driver}`);
    }

    const relativeDirectory = join('driver-notes', noteId);
    const fileName = `lieferschein-${noteId.slice(-8)}.html`;
    const absoluteDirectory = join(this.storageRoot, relativeDirectory);
    const absolutePath = join(absoluteDirectory, fileName);

    await ensureDir(absoluteDirectory);
    await writeFile(absolutePath, html, 'utf8');

    return this.toPublicStoragePath(relativeDirectory, fileName);
  }

  private toPublicStoragePath(relativeDirectory: string, fileName: string): string {
    const relativePath = `/storage/${relativeDirectory.replaceAll('\\', '/')}/${fileName}`;
    return this.publicBaseUrl ? `${this.publicBaseUrl}${relativePath}` : relativePath;
  }

  private resolveExtension(originalName: string): string {
    const extension = extname(originalName).toLowerCase();
    return extension && extension !== '.heic' ? '.jpg' : '.jpg';
  }
}
