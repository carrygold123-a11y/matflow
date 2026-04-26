CREATE TYPE "UserRole" AS ENUM ('worker', 'manager', 'admin');
CREATE TYPE "MaterialStatus" AS ENUM ('available', 'reserved', 'picked_up');
CREATE TYPE "MaterialCondition" AS ENUM ('new', 'good', 'used', 'damaged');
CREATE TYPE "TransportStatus" AS ENUM ('planned', 'in_transit', 'delivered');

CREATE TABLE "Site" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "siteId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Material" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "condition" "MaterialCondition" NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "siteId" TEXT NOT NULL,
  "status" "MaterialStatus" NOT NULL DEFAULT 'available',
  "suggestedCategory" TEXT,
  "createdById" TEXT,
  "reservedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Truck" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "available" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Truck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransportRequest" (
  "id" TEXT NOT NULL,
  "materialId" TEXT NOT NULL,
  "fromSiteId" TEXT NOT NULL,
  "toSiteId" TEXT NOT NULL,
  "truckId" TEXT NOT NULL,
  "status" "TransportStatus" NOT NULL DEFAULT 'planned',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TransportRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_siteId_idx" ON "User"("siteId");
CREATE INDEX "Material_category_idx" ON "Material"("category");
CREATE INDEX "Material_status_idx" ON "Material"("status");
CREATE INDEX "Material_siteId_idx" ON "Material"("siteId");
CREATE INDEX "Truck_siteId_idx" ON "Truck"("siteId");
CREATE INDEX "Truck_available_idx" ON "Truck"("available");
CREATE INDEX "TransportRequest_materialId_idx" ON "TransportRequest"("materialId");
CREATE INDEX "TransportRequest_status_idx" ON "TransportRequest"("status");
CREATE INDEX "TransportRequest_truckId_idx" ON "TransportRequest"("truckId");
CREATE INDEX "NotificationEvent_entityType_entityId_idx" ON "NotificationEvent"("entityType", "entityId");
CREATE INDEX "NotificationEvent_createdAt_idx" ON "NotificationEvent"("createdAt");

ALTER TABLE "User" ADD CONSTRAINT "User_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Material" ADD CONSTRAINT "Material_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Material" ADD CONSTRAINT "Material_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Material" ADD CONSTRAINT "Material_reservedById_fkey" FOREIGN KEY ("reservedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransportRequest" ADD CONSTRAINT "TransportRequest_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransportRequest" ADD CONSTRAINT "TransportRequest_fromSiteId_fkey" FOREIGN KEY ("fromSiteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransportRequest" ADD CONSTRAINT "TransportRequest_toSiteId_fkey" FOREIGN KEY ("toSiteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransportRequest" ADD CONSTRAINT "TransportRequest_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
