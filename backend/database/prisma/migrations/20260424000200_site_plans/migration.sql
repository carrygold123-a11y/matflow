CREATE TYPE "SitePlanStatus" AS ENUM ('draft', 'published');

CREATE TYPE "SitePlanPriority" AS ENUM ('critical', 'focus', 'ready');

CREATE TABLE "SitePlan" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "planDate" DATE NOT NULL,
    "status" "SitePlanStatus" NOT NULL DEFAULT 'draft',
    "briefing" TEXT NOT NULL DEFAULT '',
    "safetyNotes" TEXT NOT NULL DEFAULT '',
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitePlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SitePlanZone" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shiftLabel" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "supportCategory" TEXT NOT NULL,
    "priority" "SitePlanPriority" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "leadUserId" TEXT,
    "supportMaterialId" TEXT,
    "supportTruckId" TEXT,
    "activeTransportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitePlanZone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SitePlanAssignment" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitePlanAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SitePlan_siteId_planDate_key" ON "SitePlan"("siteId", "planDate");
CREATE INDEX "SitePlan_planDate_idx" ON "SitePlan"("planDate");
CREATE INDEX "SitePlan_status_idx" ON "SitePlan"("status");

CREATE INDEX "SitePlanZone_planId_sortOrder_idx" ON "SitePlanZone"("planId", "sortOrder");
CREATE INDEX "SitePlanZone_leadUserId_idx" ON "SitePlanZone"("leadUserId");

CREATE UNIQUE INDEX "SitePlanAssignment_zoneId_userId_key" ON "SitePlanAssignment"("zoneId", "userId");
CREATE INDEX "SitePlanAssignment_userId_idx" ON "SitePlanAssignment"("userId");
CREATE INDEX "SitePlanAssignment_zoneId_sortOrder_idx" ON "SitePlanAssignment"("zoneId", "sortOrder");

ALTER TABLE "SitePlan" ADD CONSTRAINT "SitePlan_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SitePlan" ADD CONSTRAINT "SitePlan_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SitePlanZone" ADD CONSTRAINT "SitePlanZone_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SitePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SitePlanZone" ADD CONSTRAINT "SitePlanZone_leadUserId_fkey" FOREIGN KEY ("leadUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SitePlanZone" ADD CONSTRAINT "SitePlanZone_supportMaterialId_fkey" FOREIGN KEY ("supportMaterialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SitePlanZone" ADD CONSTRAINT "SitePlanZone_supportTruckId_fkey" FOREIGN KEY ("supportTruckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SitePlanZone" ADD CONSTRAINT "SitePlanZone_activeTransportId_fkey" FOREIGN KEY ("activeTransportId") REFERENCES "TransportRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SitePlanAssignment" ADD CONSTRAINT "SitePlanAssignment_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "SitePlanZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SitePlanAssignment" ADD CONSTRAINT "SitePlanAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;