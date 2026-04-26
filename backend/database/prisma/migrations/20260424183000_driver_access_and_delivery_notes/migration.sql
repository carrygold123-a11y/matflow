ALTER TABLE "Truck"
ADD COLUMN "licensePlate" TEXT;

UPDATE "Truck"
SET "licensePlate" = CASE "id"
  WHEN 'truck-01' THEN 'B-AT-1041'
  WHEN 'truck-02' THEN 'B-AT-1042'
  WHEN 'truck-03' THEN 'HH-EL-2203'
  WHEN 'truck-04' THEN 'HH-AL-2204'
  WHEN 'truck-05' THEN 'M-IS-3305'
  WHEN 'truck-06' THEN 'M-BY-3306'
  WHEN 'truck-07' THEN 'K-RH-4407'
  WHEN 'truck-08' THEN 'K-DM-4408'
  WHEN 'truck-09' THEN 'F-MN-5509'
  WHEN 'truck-10' THEN 'F-SK-5510'
  ELSE CONCAT('TR-', SUBSTRING("id" FROM GREATEST(LENGTH("id") - 5, 1)))
END;

ALTER TABLE "Truck"
ALTER COLUMN "licensePlate" SET NOT NULL;

CREATE UNIQUE INDEX "Truck_licensePlate_key" ON "Truck"("licensePlate");

ALTER TABLE "TransportRequest"
ADD COLUMN "deliveryNotePath" TEXT,
ADD COLUMN "driverAccessCodeHash" TEXT,
ADD COLUMN "driverCompany" TEXT,
ADD COLUMN "driverName" TEXT,
ADD COLUMN "loadedAt" TIMESTAMP(3),
ADD COLUMN "loadingQrToken" TEXT,
ADD COLUMN "loadingSignaturePath" TEXT,
ADD COLUMN "loadingSignedAt" TIMESTAMP(3),
ADD COLUMN "loadingSignedBy" TEXT,
ADD COLUMN "unloadingQrToken" TEXT,
ADD COLUMN "unloadingScannedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "TransportRequest_loadingQrToken_key" ON "TransportRequest"("loadingQrToken");
CREATE UNIQUE INDEX "TransportRequest_unloadingQrToken_key" ON "TransportRequest"("unloadingQrToken");
