-- CreateTable
CREATE TABLE "DriverNote" (
    "id" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "driverName" TEXT NOT NULL DEFAULT '',
    "fromSiteId" TEXT NOT NULL,
    "toSiteId" TEXT NOT NULL,
    "signaturePath" TEXT,
    "signedAt" TIMESTAMP(3),
    "deliveryNotePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DriverNote_licensePlate_idx" ON "DriverNote"("licensePlate");
CREATE INDEX "DriverNote_fromSiteId_idx" ON "DriverNote"("fromSiteId");
CREATE INDEX "DriverNote_toSiteId_idx" ON "DriverNote"("toSiteId");

-- AddForeignKey
ALTER TABLE "DriverNote" ADD CONSTRAINT "DriverNote_fromSiteId_fkey" FOREIGN KEY ("fromSiteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DriverNote" ADD CONSTRAINT "DriverNote_toSiteId_fkey" FOREIGN KEY ("toSiteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
