-- Multi-category web public votes (align with SMS: one vote per category per visitor;
-- at most one category vote per vehicle per visitor).

DELETE FROM "vehicle_public_votes";

ALTER TABLE "vehicle_public_votes" RENAME COLUMN "voterKey" TO "visitorKey";

ALTER TABLE "vehicle_public_votes" ADD COLUMN "votingCategoryId" TEXT NOT NULL;

DROP INDEX IF EXISTS "vehicle_public_votes_eventId_vehicleEntryCode_voterKey_key";

CREATE UNIQUE INDEX "vehicle_public_votes_eventId_votingCategoryId_visitorKey_key"
  ON "vehicle_public_votes"("eventId", "votingCategoryId", "visitorKey");

CREATE UNIQUE INDEX "vehicle_public_votes_eventId_vehicleEntryCode_visitorKey_key"
  ON "vehicle_public_votes"("eventId", "vehicleEntryCode", "visitorKey");

ALTER TABLE "vehicle_public_votes"
  ADD CONSTRAINT "vehicle_public_votes_votingCategoryId_fkey"
  FOREIGN KEY ("votingCategoryId") REFERENCES "voting_categories"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
