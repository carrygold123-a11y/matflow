import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { DriverNotesController } from './driver-notes.controller';
import { DriverNotesService } from './driver-notes.service';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [DriverNotesController],
  providers: [DriverNotesService],
  exports: [DriverNotesService],
})
export class DriverNotesModule {}
