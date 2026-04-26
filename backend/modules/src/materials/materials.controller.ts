import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { MaterialItem } from '@matflow/shared-types';
import type { RequestUser } from '../common/request-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { UploadedFile as MaterialUploadFile } from '../storage/uploaded-file.interface';
import { CreateMaterialDto } from './dto/create-material.dto';
import { ListMaterialsDto } from './dto/list-materials.dto';
import { UpdateMaterialStatusDto } from './dto/update-material-status.dto';
import { MaterialsService } from './materials.service';

@Controller('materials')
@UseGuards(JwtAuthGuard)
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  list(@Query() query: ListMaterialsDto, @Req() req: { user: RequestUser }): Promise<MaterialItem[]> {
    return this.materialsService.list(query, req.user);
  }

  @Get('nearby')
  nearby(@Query() query: ListMaterialsDto, @Req() req: { user: RequestUser }): Promise<MaterialItem[]> {
    return this.materialsService.nearby(query, req.user);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @Req() req: { user: RequestUser }): Promise<MaterialItem> {
    return this.materialsService.getOne(id, req.user);
  }

  @Get(':id/dependents')
  dependents(@Param('id') id: string): Promise<{ transports: number; zones: number }> {
    return this.materialsService.dependents(id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  create(
    @Body() dto: CreateMaterialDto,
    @UploadedFile() file: MaterialUploadFile | undefined,
    @Req() req: { user: RequestUser },
  ): Promise<MaterialItem> {
    return this.materialsService.create(dto, file, req.user);
  }

  @Post(':id/reserve')
  reserve(@Param('id') id: string, @Req() req: { user: RequestUser }): Promise<MaterialItem> {
    return this.materialsService.reserve(id, req.user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMaterialStatusDto,
    @Req() req: { user: RequestUser },
  ): Promise<MaterialItem> {
    return this.materialsService.updateStatus(id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: { user: RequestUser }): Promise<{ id: string }> {
    return this.materialsService.remove(id, req.user);
  }
}
