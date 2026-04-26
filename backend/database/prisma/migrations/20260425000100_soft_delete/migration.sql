-- Add soft delete columns to Site and Material
ALTER TABLE "Site" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Material" ADD COLUMN "deletedAt" TIMESTAMP(3);
