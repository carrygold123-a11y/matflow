import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  AuthModule,
  DriverNotesModule,
  MaterialsModule,
  NotificationsModule,
  PlanningModule,
  PrismaModule,
  SitesModule,
  StorageModule,
  TransportModule,
  TrucksModule,
  UsersModule,
} from '@matflow/backend-modules';
import { resolve } from 'path';
import { validateEnv } from './config/env';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [resolve(process.cwd(), '../../.env'), resolve(process.cwd(), '.env')],
      validate: validateEnv,
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    StorageModule,
    AuthModule,
    DriverNotesModule,
    NotificationsModule,
    PlanningModule,
    MaterialsModule,
    TransportModule,
    TrucksModule,
    SitesModule,
    UsersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
