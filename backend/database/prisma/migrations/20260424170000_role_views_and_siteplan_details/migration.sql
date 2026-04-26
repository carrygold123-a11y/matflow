CREATE TYPE "SitePlanShiftStatus" AS ENUM ('not_ready', 'ready', 'active', 'blocked', 'complete');

CREATE TYPE "SitePlanBriefingCategory" AS ENUM ('operations', 'safety', 'logistics');

CREATE TYPE "SitePlanMaterialNeedStatus" AS ENUM ('needed', 'ordered', 'ready', 'delivered');

ALTER TABLE "SitePlan"
ADD COLUMN "shiftStatus" "SitePlanShiftStatus" NOT NULL DEFAULT 'ready';

CREATE TABLE "SitePlanBriefing" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "category" "SitePlanBriefingCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitePlanBriefing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SitePlanMaterialNeed" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "materialId" TEXT,
    "label" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "status" "SitePlanMaterialNeedStatus" NOT NULL DEFAULT 'needed',
    "notes" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitePlanMaterialNeed_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SitePlanBriefing_planId_sortOrder_idx" ON "SitePlanBriefing"("planId", "sortOrder");
CREATE INDEX "SitePlanMaterialNeed_zoneId_sortOrder_idx" ON "SitePlanMaterialNeed"("zoneId", "sortOrder");
CREATE INDEX "SitePlanMaterialNeed_materialId_idx" ON "SitePlanMaterialNeed"("materialId");

ALTER TABLE "SitePlanBriefing" ADD CONSTRAINT "SitePlanBriefing_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SitePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SitePlanMaterialNeed" ADD CONSTRAINT "SitePlanMaterialNeed_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "SitePlanZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SitePlanMaterialNeed" ADD CONSTRAINT "SitePlanMaterialNeed_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;