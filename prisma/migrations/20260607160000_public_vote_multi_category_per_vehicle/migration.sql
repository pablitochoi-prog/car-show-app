-- Allow the same visitor to vote for one vehicle in multiple public voting categories
-- (e.g. People's Choice and Kid's Choice for the same car).

DROP INDEX IF EXISTS "vehicle_public_votes_eventId_vehicleEntryCode_visitorKey_key";
