# MatFlow

MatFlow is an internal construction logistics platform for sharing spare material by photo, finding the nearest available stock, reserving it and dispatching company trucks for pickup and delivery.

## Monorepo layout

- `apps/mobile` Flutter field app with login, feed, camera-first material creation, detail, map and transport screens
- `apps/web` React + Vite operations dashboard with search, filters, upload preview, map panel and transport board
- `backend/api` NestJS bootstrap application
- `backend/database` Prisma schema, SQL migration and demo seed script
- `backend/modules` Nest feature modules for auth, materials, transports, trucks, sites, users and notifications
- `infra/docker` Dockerfiles and nginx configuration
- `infra/deployment` production deployment notes
- `shared/types` shared TypeScript contracts
- `shared/utils` shared business utilities including category suggestion and Haversine distance

## Features implemented

- JWT login with demo users
- `POST /materials` with multipart image upload and compression
- `GET /materials` and `GET /materials/nearby` with search, status, category and distance filtering
- `POST /materials/:id/reserve` and `PATCH /materials/:id/status`
- `POST /transport-requests` and `PATCH /transport-requests/:id/status`
- trucks, sites, users and notifications endpoints
- event-based notification log persistence
- health endpoint at `GET /health`
- Prisma migration and demo seed data for 5 sites, 20 materials, 10 trucks and 10 users

## Demo credentials

- `mara@matflow.local` / `matflow123`
- `jonas@matflow.local` / `matflow123`

## Local setup

1. Copy `.env.example` to `.env`.
2. Start the stack with `docker-compose up --build`.
3. Open the web app at `http://localhost:8080`.
4. API is available at `http://localhost:3000`.

## Local development without Docker

1. Install Node.js 20+, npm and Flutter.
2. Run `npm install` in the repository root.
3. Generate Prisma clients with `npm run db:generate`.
4. Apply migrations with `npm run db:migrate`.
5. Seed demo data with `npm run db:seed`.
6. Start the API with `npm run dev:api`.
7. Start the web app with `npm run dev:web`.
8. In `apps/mobile`, run `flutter pub get` and `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000`.

## Scripts

- `npm run build`
- `npm run test`
- `npm run db:generate`
- `npm run db:migrate`
- `npm run db:seed`
- `npm run dev:api`
- `npm run dev:web`

## API summary

- `POST /auth/login`
- `GET /health`
- `GET /materials`
- `GET /materials/nearby`
- `GET /materials/:id`
- `POST /materials`
- `POST /materials/:id/reserve`
- `PATCH /materials/:id/status`
- `GET /transport-requests`
- `POST /transport-requests`
- `PATCH /transport-requests/:id/status`
- `GET /trucks`
- `GET /sites`
- `GET /users`
- `GET /users/me`
- `GET /notifications`

## Notes

- Uploaded images are stored under `/app/storage` in Docker and served by the API under `/storage/*`.
- Category suggestion is implemented with a deterministic keyword-based mock classifier.
- Distance ordering uses Haversine calculations and defaults to the authenticated user's site when no explicit coordinates are passed.
- Production rollout guidance is documented in `infra/deployment/production-guide.md`.
