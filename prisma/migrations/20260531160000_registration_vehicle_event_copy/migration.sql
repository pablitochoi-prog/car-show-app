-- Event-specific nickname and story on registration vehicles (independent from garage profile).
ALTER TABLE "registration_vehicles" ADD COLUMN "vehicleNickname" TEXT;
ALTER TABLE "registration_vehicles" ADD COLUMN "vehicleStory" TEXT;
