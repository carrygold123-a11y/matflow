import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@matflow/shared-types';
import { canAccessAllSites } from '../common/access-control';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../common/request-user.interface';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(currentUser: RequestUser): Promise<AuthUser[]> {
    const users = await this.prismaService.user.findMany({
      where: canAccessAllSites(currentUser) ? undefined : { siteId: currentUser.siteId },
      include: { site: true },
      orderBy: { name: 'asc' },
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      siteId: user.siteId,
      site: user.site,
    }));
  }

  async me(currentUser: RequestUser): Promise<AuthUser> {
    const user = await this.prismaService.user.findUnique({
      where: { id: currentUser.id },
      include: { site: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      siteId: user.siteId,
      site: user.site,
    };
  }
}
