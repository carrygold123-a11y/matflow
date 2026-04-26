# Production Deployment Guide

## Recommended target

Use a managed PostgreSQL service plus two container workloads:

- API container from `infra/docker/api.Dockerfile`
- Web container from `infra/docker/web.Dockerfile`
- Object storage compatible with S3 for future storage driver extension

## Baseline setup

1. Provision PostgreSQL 16 with automated backups and point `DATABASE_URL` to it.
2. Store runtime secrets in a managed secret store.
3. Mount persistent storage for `/app/storage` until the storage driver is switched to S3.
4. Build and push both container images from CI.
5. Run `npm run migrate:deploy --workspace @matflow/database` as a release step before updating API tasks.

## Environment variables

- `DATABASE_URL`
- `PORT`
- `JWT_SECRET`
- `STORAGE_PATH`
- `STORAGE_DRIVER`
- `STORAGE_PUBLIC_BASE_URL`
- `VITE_API_URL`

## Scaling notes

- Run at least 2 API replicas behind a load balancer.
- Keep PostgreSQL connection pooling in front of the database for burst traffic.
- Move file storage to S3-compatible storage before horizontal API scaling.
- Add CDN caching in front of the web container and uploaded images.
- Promote Haversine filtering to a PostGIS strategy if material volumes become large.

## CI/CD outline

1. Install dependencies.
2. Generate Prisma clients.
3. Build shared packages, backend modules, API and web.
4. Run API tests.
5. Build and push images.
6. Apply migrations.
7. Roll API, then web.
