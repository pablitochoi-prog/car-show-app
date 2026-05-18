-- AlterTable
ALTER TABLE "events" ADD COLUMN "smsVotePrefix" TEXT;
ALTER TABLE "events" ADD COLUMN "nextVehicleNumber" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "registration_vehicles" ADD COLUMN "publicVehicleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "events_smsVotePrefix_key" ON "events"("smsVotePrefix");

-- CreateIndex
CREATE UNIQUE INDEX "registration_vehicles_publicVehicleId_key" ON "registration_vehicles"("publicVehicleId");
