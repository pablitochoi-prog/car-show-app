-- Event staff can view registrant profile + vehicle photos after registration (semi-private).
ALTER TABLE "registrations" ADD COLUMN "registrantPhotoObjectKey" TEXT;

ALTER TABLE "registration_vehicles" ADD COLUMN "eventPhotoObjectKey" TEXT;
