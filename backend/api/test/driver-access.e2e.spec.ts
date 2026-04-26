import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import type { ExecutionContext, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthController, AuthService, JwtAuthGuard, TransportController, TransportService } from '@matflow/backend-modules';

describe('Driver access flow', () => {
  let app: INestApplication;

  const transportFixture = {
    id: 'transport-01',
    materialId: 'material-02',
    fromSiteId: 'site-berlin-01',
    toSiteId: 'site-frankfurt-01',
    truckId: 'truck-10',
    status: 'planned',
    createdAt: '2026-04-24T05:00:00.000Z',
    updatedAt: '2026-04-24T05:00:00.000Z',
    material: {
      id: 'material-02',
      title: 'Steel beams',
      description: '8 galvanized steel beams with minor scratches',
      category: 'Steel',
      quantity: 8,
      condition: 'good',
      imageUrl: '/storage/materials/steel.jpg',
      location: { lat: 52.5196, lng: 13.4057 },
      siteId: 'site-berlin-01',
      status: 'reserved',
      distanceKm: 0,
      createdAt: '2026-04-24T05:00:00.000Z',
      updatedAt: '2026-04-24T05:00:00.000Z',
    },
    truck: {
      id: 'truck-10',
      name: 'Truck Skyline',
      licensePlate: 'F-SK-5510',
      siteId: 'site-frankfurt-01',
      available: false,
      site: {
        id: 'site-frankfurt-01',
        name: 'Frankfurt Ost',
        latitude: 50.1129,
        longitude: 8.7372,
      },
    },
    fromSite: {
      id: 'site-berlin-01',
      name: 'Berlin Mitte',
      latitude: 52.5208,
      longitude: 13.4095,
    },
    toSite: {
      id: 'site-frankfurt-01',
      name: 'Frankfurt Ost',
      latitude: 50.1129,
      longitude: 8.7372,
    },
    driverAccess: {
      loginPlate: 'F-SK-5510',
      accessCode: null,
      driverName: 'Pavel Nowak',
      driverCompany: 'Atlas Tiefbau Logistik',
      loadingQrToken: 'loading-token-01',
      unloadingQrToken: 'unloading-token-01',
      loadingScannedAt: null,
      unloadingScannedAt: null,
      loadingSignedAt: null,
      loadingSignedBy: null,
      loadingSignaturePath: null,
      deliveryNotePath: null,
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController, TransportController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            driverLogin: jest.fn().mockResolvedValue({
              accessToken: 'driver-token',
              transport: transportFixture,
            }),
          },
        },
        {
          provide: TransportService,
          useValue: {
            list: jest.fn(),
            create: jest.fn(),
            updateStatus: jest.fn(),
            getDriverCurrent: jest.fn().mockResolvedValue(transportFixture),
            confirmDriverLoading: jest.fn().mockResolvedValue({
              ...transportFixture,
              status: 'in_transit',
              driverAccess: {
                ...transportFixture.driverAccess,
                loadingScannedAt: '2026-04-24T06:15:00.000Z',
                loadingSignedAt: '2026-04-24T06:15:00.000Z',
                loadingSignedBy: 'Pavel Nowak',
                loadingSignaturePath: '/storage/sites/site-berlin-01/driver-signatures/signature.svg',
              },
            }),
            confirmDriverUnloading: jest.fn().mockResolvedValue({
              ...transportFixture,
              status: 'delivered',
              driverAccess: {
                ...transportFixture.driverAccess,
                deliveryNotePath: '/storage/sites/site-frankfurt-01/lieferscheine/transport-01-2026-04-24.html',
                unloadingScannedAt: '2026-04-24T08:05:00.000Z',
              },
            }),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const requestContext = context.switchToHttp().getRequest();
          requestContext.user = {
            id: 'driver-pass:transport-01',
            email: 'fsk5510@driver.bauflow.local',
            name: 'Pavel Nowak',
            role: 'fahrer',
            siteId: 'site-berlin-01',
            authMode: 'driver-pass',
            transportId: 'transport-01',
            truckId: 'truck-10',
            licensePlate: 'F-SK-5510',
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/driver-login returns a driver transport session', async () => {
    await request(app.getHttpServer())
      .post('/auth/driver-login')
      .send({
        licensePlate: 'F-SK-5510',
        accessCode: '741852',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.accessToken).toBe('driver-token');
        expect(body.transport.truck.licensePlate).toBe('F-SK-5510');
      });
  });

  it('POST /transport-requests/:id/driver/loading-scan validates the loading payload', async () => {
    await request(app.getHttpServer())
      .post('/transport-requests/transport-01/driver/loading-scan')
      .set('Authorization', 'Bearer driver-token')
      .send({
        qrToken: 'loading-token-01',
        signedBy: 'Pavel Nowak',
        signatureSvg: '<svg viewBox="0 0 120 40"><path d="M2 30 C 20 5, 40 5, 60 30" stroke="#111" fill="none"/></svg>',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe('in_transit');
        expect(body.driverAccess.loadingSignedBy).toBe('Pavel Nowak');
      });
  });

  it('POST /transport-requests/:id/driver/unloading-scan returns the generated delivery note path', async () => {
    await request(app.getHttpServer())
      .post('/transport-requests/transport-01/driver/unloading-scan')
      .set('Authorization', 'Bearer driver-token')
      .send({
        qrToken: 'unloading-token-01',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.status).toBe('delivered');
        expect(body.driverAccess.deliveryNotePath).toContain('/storage/sites/site-frankfurt-01/lieferscheine/');
      });
  });
});
