-- Mailing address captured at registration (member + guest).
ALTER TABLE "registrations" ADD COLUMN "registrantStreet" TEXT;
ALTER TABLE "registrations" ADD COLUMN "registrantCity" TEXT;
ALTER TABLE "registrations" ADD COLUMN "registrantState" TEXT;
ALTER TABLE "registrations" ADD COLUMN "registrantZip" TEXT;
ALTER TABLE "registrations" ADD COLUMN "guestStreet" TEXT;
ALTER TABLE "registrations" ADD COLUMN "guestCity" TEXT;
ALTER TABLE "registrations" ADD COLUMN "guestState" TEXT;
ALTER TABLE "registrations" ADD COLUMN "guestZip" TEXT;
