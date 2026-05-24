-- Vehicle QR fields on registration vehicles
ALTER TABLE "registration_vehicles" ADD COLUMN IF NOT EXISTS "vehicleQrObjectKey" TEXT;
ALTER TABLE "registration_vehicles" ADD COLUMN IF NOT EXISTS "vehicleQrUrl" TEXT;
ALTER TABLE "registration_vehicles" ADD COLUMN IF NOT EXISTS "votingStatus" TEXT;
ALTER TABLE "registration_vehicles" ADD COLUMN IF NOT EXISTS "judgingStatus" TEXT;

-- Public votes per vehicle entry
CREATE TABLE IF NOT EXISTS "vehicle_public_votes" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "vehicleEntryCode" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "registrationVehicleId" TEXT,
    "voterKey" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_public_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "vehicle_public_votes_eventId_vehicleEntryCode_voterKey_key"
    ON "vehicle_public_votes"("eventId", "vehicleEntryCode", "voterKey");
CREATE INDEX IF NOT EXISTS "vehicle_public_votes_eventId_vehicleEntryCode_idx"
    ON "vehicle_public_votes"("eventId", "vehicleEntryCode");

ALTER TABLE "vehicle_public_votes" ADD CONSTRAINT "vehicle_public_votes_registrationId_fkey"
    FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vehicle_public_votes" ADD CONSTRAINT "vehicle_public_votes_registrationVehicleId_fkey"
    FOREIGN KEY ("registrationVehicleId") REFERENCES "registration_vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vehicle_public_votes" ADD CONSTRAINT "vehicle_public_votes_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Judge scores per vehicle entry
CREATE TABLE IF NOT EXISTS "vehicle_judge_scores" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "vehicleEntryCode" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "registrationVehicleId" TEXT,
    "judgeUserId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_judge_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "vehicle_judge_scores_eventId_vehicleEntryCode_judgeUserId_key"
    ON "vehicle_judge_scores"("eventId", "vehicleEntryCode", "judgeUserId");
CREATE INDEX IF NOT EXISTS "vehicle_judge_scores_eventId_vehicleEntryCode_idx"
    ON "vehicle_judge_scores"("eventId", "vehicleEntryCode");

ALTER TABLE "vehicle_judge_scores" ADD CONSTRAINT "vehicle_judge_scores_registrationId_fkey"
    FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vehicle_judge_scores" ADD CONSTRAINT "vehicle_judge_scores_registrationVehicleId_fkey"
    FOREIGN KEY ("registrationVehicleId") REFERENCES "registration_vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vehicle_judge_scores" ADD CONSTRAINT "vehicle_judge_scores_judgeUserId_fkey"
    FOREIGN KEY ("judgeUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
