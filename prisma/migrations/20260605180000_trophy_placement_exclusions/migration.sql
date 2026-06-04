-- Track manually excluded vehicles per trophy place so alternates advance.

ALTER TABLE "event_trophy_placements" ADD COLUMN "excludedVehicleEntryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];
