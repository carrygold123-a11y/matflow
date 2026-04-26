import { mkdirSync } from 'fs';
import { resolve } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const storagePath = process.env.STORAGE_PATH
    ? resolve(process.env.STORAGE_PATH)
    : resolve(process.cwd(), '../../storage');
  mkdirSync(storagePath, { recursive: true });
  app.useStaticAssets(storagePath, { prefix: '/storage' });

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
}

bootstrap();
