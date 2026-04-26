import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import type { ExecutionContext, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtAuthGuard, PlanningController, PlanningService } from '@matflow/backend-modules';

describe('PlanningController', () => {
  let app: INestApplication;

  const planFixture = {
    id: 'plan-berlin-01',
    siteId: 'site-berlin-01',
    site: {
      id: 'site-berlin-01',
      name: 'Berlin Mitte',
      latitude: 52.5208,
      longitude: 13.4095,
    },
    planDate: '2026-04-24T00:00:00.000Z',
    status: 'published',
    shiftStatus: 'active',
    briefing: 'Morning briefing',
    safetyNotes: 'Use PPE',
    briefings: [
      {
        id: 'briefing-01',
        category: 'operations',
        title: 'Morning sync',
        note: 'Review the crane window before 07:00.',
        sortOrder: 0,
      },
    ],
    updatedById: 'user-polier-01',
    updatedBy: {
      id: 'user-polier-01',
      name: 'Ali Demir',
      email: 'ali@matflow.local',
      role: 'polier',
      siteId: 'site-berlin-01',
      site: {
        id: 'site-berlin-01',
        name: 'Berlin Mitte',
        latitude: 52.5208,
        longitude: 13.4095,
      },
    },
    createdAt: '2026-04-24T05:00:00.000Z',
    updatedAt: '2026-04-24T05:30:00.000Z',
    zones: [
      {
        id: 'zone-01',
        name: 'Kernhaus A',
        shiftLabel: '06:00-10:15',
        focus: 'Betonage kontrollieren',
        supportCategory: 'Concrete',
        priority: 'critical',
        sortOrder: 0,
        leadUserId: 'user-polier-01',
        leadUser: {
          id: 'user-polier-01',
          name: 'Ali Demir',
          email: 'ali@matflow.local',
          role: 'polier',
          siteId: 'site-berlin-01',
        },
        supportMaterialId: 'material-01',
        supportMaterial: null,
        supportTruckId: 'truck-01',
        supportTruck: null,
        activeTransportId: null,
        activeTransport: null,
        materialNeeds: [
          {
            id: 'need-01',
            materialId: 'material-01',
            material: null,
            label: 'Concrete reserve',
            quantity: 6,
            unit: 'bags',
            status: 'ready',
            notes: 'Deliver to Kernhaus A before pour starts.',
            sortOrder: 0,
          },
        ],
        assignments: [
          {
            id: 'assignment-01',
            userId: 'user-worker-01',
            sortOrder: 0,
            user: {
              id: 'user-worker-01',
              name: 'Felix Koch',
              email: 'felix@matflow.local',
              role: 'worker',
              siteId: 'site-berlin-01',
            },
          },
        ],
      },
    ],
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PlanningController],
      providers: [
        {
          provide: PlanningService,
          useValue: {
            getOne: jest.fn().mockResolvedValue(planFixture),
            upsert: jest.fn().mockResolvedValue(planFixture),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const requestContext = context.switchToHttp().getRequest();
          requestContext.user = {
            id: 'user-polier-01',
            email: 'ali@matflow.local',
            name: 'Ali Demir',
            role: 'polier',
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
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /site-plans returns the requested site plan', async () => {
    await request(app.getHttpServer())
      .get('/site-plans?siteId=site-berlin-01&planDate=2026-04-24')
      .set('Authorization', 'Bearer test-token')
      .expect(200)
      .expect(({ body }) => {
        expect(body.siteId).toBe('site-berlin-01');
        expect(body.status).toBe('published');
        expect(body.zones).toHaveLength(1);
      });
  });

  it('PUT /site-plans accepts a valid plan payload', async () => {
    await request(app.getHttpServer())
      .put('/site-plans?siteId=site-berlin-01')
      .set('Authorization', 'Bearer test-token')
      .send({
        planDate: '2026-04-24',
        status: 'published',
        shiftStatus: 'active',
        briefing: 'Morning briefing',
        safetyNotes: 'Use PPE',
        briefings: [
          {
            category: 'operations',
            title: 'Morning sync',
            note: 'Review the crane window before 07:00.',
            sortOrder: 0,
          },
        ],
        zones: [
          {
            id: 'zone-01',
            name: 'Kernhaus A',
            shiftLabel: '06:00-10:15',
            focus: 'Betonage kontrollieren',
            supportCategory: 'Concrete',
            priority: 'critical',
            sortOrder: 0,
            leadUserId: 'user-polier-01',
            materialNeeds: [
              {
                label: 'Concrete reserve',
                quantity: 6,
                unit: 'bags',
                status: 'ready',
                notes: 'Deliver to Kernhaus A before pour starts.',
                materialId: 'material-01',
                sortOrder: 0,
              },
            ],
            assignments: [
              {
                userId: 'user-worker-01',
                sortOrder: 0,
              },
            ],
          },
        ],
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.id).toBe('plan-berlin-01');
        expect(body.briefing).toBe('Morning briefing');
      });
  });

  it('PUT /site-plans rejects an invalid payload', async () => {
    await request(app.getHttpServer())
      .put('/site-plans?siteId=site-berlin-01')
      .set('Authorization', 'Bearer test-token')
      .send({
        planDate: '2026-04-24',
        status: 'published',
        shiftStatus: 'active',
        briefing: 'Morning briefing',
        safetyNotes: 'Use PPE',
        briefings: [],
        zones: [],
      })
      .expect(400);
  });
});