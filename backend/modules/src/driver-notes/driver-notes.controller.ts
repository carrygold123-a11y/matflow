import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { DriverNoteItem } from '@matflow/shared-types';
import type { RequestUser } from '../common/request-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateDriverNoteDto } from './dto/create-driver-note.dto';
import { DriverNotesService } from './driver-notes.service';

@Controller('driver-notes')
@UseGuards(JwtAuthGuard)
export class DriverNotesController {
  constructor(private readonly driverNotesService: DriverNotesService) {}

  @Post()
  create(
    @Body() dto: CreateDriverNoteDto,
    @Req() req: { user: RequestUser },
  ): Promise<DriverNoteItem> {
    return this.driverNotesService.create(dto, req.user);
  }
}
