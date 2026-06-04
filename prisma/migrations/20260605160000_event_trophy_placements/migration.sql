-- Manual trophy winner / alternate selections per award slot.

CREATE TABLE "event_trophy_placements" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "trophyEntryId" TEXT NOT NULL,
    "vehicleEntryCode" TEXT,
    "isVacant" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_trophy_placements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_trophy_placements_eventId_trophyEntryId_key" ON "event_trophy_placements"("eventId", "trophyEntryId");
CREATE INDEX "event_trophy_placements_eventId_idx" ON "event_trophy_placements"("eventId");

ALTER TABLE "event_trophy_placements" ADD CONSTRAINT "event_trophy_placements_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
