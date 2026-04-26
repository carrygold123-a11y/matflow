import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '@matflow/backend-modules';

@Controller('health')
export class HealthController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get()
  async check(): Promise<{ status: string; database: string; timestamp: string }> {
    await this.prismaService.$queryRaw`SELECT 1`;

    return {
      status: 'ok',
      database: 'up',
      timestamp: new Date().toISOString(),
    };
  }
}
