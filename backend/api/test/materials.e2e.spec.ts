import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import type { ExecutionContext, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtAuthGuard, MaterialsController, MaterialsService } from '@matflow/backend-modules';

describe('MaterialsController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MaterialsController],
      providers: [
        {
          provide: MaterialsService,
          useValue: {
            list: jest.fn().mockResolvedValue([
              {
                id: 'material-01',
                title: 'Concrete bags',
                description: '18 sealed concrete bags ready for pickup',
                category: 'Concrete',
                quantity: 18,
                condition: 'new',
                imageUrl: '/storage/materials/concrete.jpg',
                location: { lat: 52.5213, lng: 13.4111 },
                siteId: 'site-berlin-01',
                status: 'available',
                distanceKm: 1.3,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ]),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const requestContext = context.switchToHttp().getRequest();
          requestContext.user = {
            id: 'user-worker-01',
            email: 'ali@matflow.local',
            name: 'Ali Demir',
            role: 'worker',
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

  it('GET /materials returns filtered materials', async () => {
    await request(app.getHttpServer())
      .get('/materials?lat=52.52&lng=13.4&category=Concrete')
      .set('Authorization', 'Bearer test-token')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0].category).toBe('Concrete');
        expect(body[0].distanceKm).toBeLessThan(5);
      });
  });
});
