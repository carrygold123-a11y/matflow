import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import type { DriverLoginResponse, LoginResponse } from '@matflow/shared-types';
import type { RequestUser } from '../common/request-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { DriverLoginDto, LoginDto } from './dto.login';

function normalizeLicensePlate(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { site: true },
    });

    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: RequestUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      siteId: user.siteId,
    };

    return {
      accessToken: await this.jwtService.signAsync({
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        siteId: user.siteId,
        authMode: 'user',
      }),
      user: {
        ...payload,
        site: {
          id: user.site.id,
          name: user.site.name,
          latitude: user.site.latitude,
          longitude: user.site.longitude,
        },
      },
    };
  }

  async driverLogin(dto: DriverLoginDto): Promise<DriverLoginResponse> {
    const normalizedLicensePlate = normalizeLicensePlate(dto.licensePlate);
    const trucks = await this.prismaService.truck.findMany({
      include: { site: true },
    });
    const truck = trucks.find((t) => normalizeLicensePlate(t.licensePlate) === normalizedLicensePlate);

    if (!truck) {
      throw new UnauthorizedException('Kennzeichen nicht im System registriert');
    }

    const payload: RequestUser = {
      id: `driver:${truck.id}`,
      email: `${truck.licensePlate.toLowerCase()}@driver.bauflow.local`,
      name: truck.name,
      role: 'fahrer',
      siteId: truck.siteId,
      authMode: 'driver-pass',
      truckId: truck.id,
      licensePlate: truck.licensePlate,
    };

    return {
      accessToken: await this.jwtService.signAsync({
        sub: payload.id,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        siteId: payload.siteId,
        authMode: payload.authMode,
        truckId: payload.truckId,
        licensePlate: payload.licensePlate,
      }, { expiresIn: '30d' }),
      truck: {
        id: truck.id,
        name: truck.name,
        licensePlate: truck.licensePlate,
      },
    };
  }
}
