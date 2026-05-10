-- AlterTable: add archivedAt to users
ALTER TABLE "users" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- AlterTable: add archivedAt to vehicles
ALTER TABLE "vehicles" ADD COLUMN "archivedAt" TIMESTAMP(3);
