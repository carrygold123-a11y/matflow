"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const supertest_1 = __importDefault(require("supertest"));
const backend_modules_1 = require("@matflow/backend-modules");
const health_controller_1 = require("../src/health/health.controller");
describe('HealthController', () => {
    let app;
    beforeAll(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            controllers: [health_controller_1.HealthController],
            providers: [
                {
                    provide: backend_modules_1.PrismaService,
                    useValue: {
                        $queryRaw: jest.fn().mockResolvedValue([{ ok: 1 }]),
                    },
                },
            ],
        }).compile();
        app = moduleRef.createNestApplication();
        await app.init();
    });
    afterAll(async () => {
        await app.close();
    });
    it('GET /health responds with status ok', async () => {
        await (0, supertest_1.default)(app.getHttpServer())
            .get('/health')
            .expect(200)
            .expect(({ body }) => {
            expect(body.status).toBe('ok');
            expect(body.database).toBe('up');
        });
    });
});
