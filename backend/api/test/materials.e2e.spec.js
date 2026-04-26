"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const supertest_1 = __importDefault(require("supertest"));
const backend_modules_1 = require("@matflow/backend-modules");
describe('MaterialsController', () => {
    let app;
    beforeAll(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            controllers: [backend_modules_1.MaterialsController],
            providers: [
                {
                    provide: backend_modules_1.MaterialsService,
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
            .overrideGuard(backend_modules_1.JwtAuthGuard)
            .useValue({
            canActivate: (context) => {
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
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            transform: true,
        }));
        await app.init();
    });
    afterAll(async () => {
        await app.close();
    });
    it('GET /materials returns filtered materials', async () => {
        await (0, supertest_1.default)(app.getHttpServer())
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
