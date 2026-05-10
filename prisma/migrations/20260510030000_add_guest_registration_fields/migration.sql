-- Make userId optional for guest registrations
ALTER TABLE "registrations" ALTER COLUMN "userId" DROP NOT NULL;

-- Add guest contact fields
ALTER TABLE "registrations" ADD COLUMN "guestFirstName" TEXT;
ALTER TABLE "registrations" ADD COLUMN "guestLastName"  TEXT;
ALTER TABLE "registrations" ADD COLUMN "guestEmail"     TEXT;
ALTER TABLE "registrations" ADD COLUMN "guestPhone"     TEXT;
ALTER TABLE "registrations" ADD COLUMN "guestVehicles"  JSONB;

-- Index for looking up guest registrations by email per event
CREATE INDEX "registrations_eventId_guestEmail_idx" ON "registrations"("eventId", "guestEmail");
