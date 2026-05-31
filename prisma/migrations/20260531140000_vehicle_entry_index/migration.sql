-- Phase 1A: indexed vehicle entry lookup table (read path unchanged; writes + backfill only)

CREATE TYPE "VehicleEntryIndexType" AS ENUM ('REGISTRATION_VEHICLE', 'GUEST_JSON');

CREATE TABLE "vehicle_entry_index" (
    "id" TEXT NOT NULL,
    "publicVehicleId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "entryType" "VehicleEntryIndexType" NOT NULL,
    "registrationVehicleId" TEXT,
    "guestVehicleIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_entry_index_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vehicle_entry_index_publicVehicleId_key" ON "vehicle_entry_index"("publicVehicleId");
CREATE UNIQUE INDEX "vehicle_entry_index_registrationVehicleId_key" ON "vehicle_entry_index"("registrationVehicleId");
CREATE INDEX "vehicle_entry_index_eventId_idx" ON "vehicle_entry_index"("eventId");
CREATE INDEX "vehicle_entry_index_registrationId_idx" ON "vehicle_entry_index"("registrationId");

ALTER TABLE "vehicle_entry_index" ADD CONSTRAINT "vehicle_entry_index_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vehicle_entry_index" ADD CONSTRAINT "vehicle_entry_index_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vehicle_entry_index" ADD CONSTRAINT "vehicle_entry_index_registrationVehicleId_fkey" FOREIGN KEY ("registrationVehicleId") REFERENCES "registration_vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
