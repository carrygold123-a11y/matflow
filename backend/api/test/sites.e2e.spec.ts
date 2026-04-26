import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import type { ExecutionContext, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtAuthGuard, SitesController, SitesService } from '@matflow/backend-modules';

describe('SitesController', () => {
  let app: INestApplication;
  const create = jest.fn().mockResolvedValue({
    id: 'site-smoke-01',
    name: 'Smoke Site',
    latitude: 52.5301,
    longitude: 13.4022,
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SitesController],
      providers: [
        {
          provide: SitesService,
          useValue: {
            list: jest.fn().mockResolvedValue([]),
            dependents: jest.fn().mockResolvedValue({
              users: 0,
              materials: 0,
              trucks: 0,
              sitePlans: 0,
              transports: 0,
            }),
            create,
            remove: jest.fn().mockResolvedValue({ id: 'site-smoke-01' }),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const requestContext = context.switchToHttp().getRequest();
          requestContext.user = {
            id: 'user-admin-01',
            email: 'mara@matflow.local',
            name: 'Mara Schneider',
            role: 'admin',
            siteId: 'site-berlin-01',
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
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    create.mockClear();
  });

  it('POST /sites accepts latitude and longitude payload', async () => {
    await request(app.getHttpServer())
      .post('/sites')
      .set('Authorization', 'Bearer test-token')
      .send({
        name: 'Smoke Site',
        latitude: 52.5301,
        longitude: 13.4022,
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.name).toBe('Smoke Site');
        expect(body.latitude).toBe(52.5301);
        expect(body.longitude).toBe(13.4022);
      });

    expect(create).toHaveBeenCalledWith(
      {
        name: 'Smoke Site',
        latitude: 52.5301,
        longitude: 13.4022,
      },
      expect.objectContaining({ id: 'user-admin-01' }),
    );
  });

  it('POST /sites rejects invalid coordinate payloads', async () => {
    await request(app.getHttpServer())
      .post('/sites')
      .set('Authorization', 'Bearer test-token')
      .send({
        name: 'Broken Site',
        latitude: 'not-a-number',
        longitude: 13.4022,
      })
      .expect(400);
  });
});