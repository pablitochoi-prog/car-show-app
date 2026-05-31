-- User profile SMS consent
ALTER TABLE "users" ADD COLUMN "smsNotificationsOptIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "smsNotificationsOptInAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "smsNotificationsOptInSource" TEXT;
ALTER TABLE "users" ADD COLUMN "smsNotificationsOptInPhone" TEXT;
ALTER TABLE "users" ADD COLUMN "smsNotificationsOptInIpAddress" TEXT;
ALTER TABLE "users" ADD COLUMN "smsNotificationsOptInUserAgent" TEXT;
ALTER TABLE "users" ADD COLUMN "smsNotificationsOptOutAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "smsNotificationsConsentTextVersion" TEXT;

-- Registration SMS consent
ALTER TABLE "registrations" ADD COLUMN "smsNotificationsOptIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "registrations" ADD COLUMN "smsNotificationsOptInAt" TIMESTAMP(3);
ALTER TABLE "registrations" ADD COLUMN "smsNotificationsOptInSource" TEXT;
ALTER TABLE "registrations" ADD COLUMN "smsNotificationsOptInPhone" TEXT;
ALTER TABLE "registrations" ADD COLUMN "smsNotificationsOptInIpAddress" TEXT;
ALTER TABLE "registrations" ADD COLUMN "smsNotificationsOptInUserAgent" TEXT;
ALTER TABLE "registrations" ADD COLUMN "smsNotificationsOptOutAt" TIMESTAMP(3);
ALTER TABLE "registrations" ADD COLUMN "smsNotificationsConsentTextVersion" TEXT;

-- Vehicle sale inquiry: expand buyer SMS fields to full consent metadata
ALTER TABLE "vehicle_sale_inquiries" RENAME COLUMN "buyerSmsOptIn" TO "smsNotificationsOptIn";
ALTER TABLE "vehicle_sale_inquiries" RENAME COLUMN "buyerSmsOptInAt" TO "smsNotificationsOptInAt";
ALTER TABLE "vehicle_sale_inquiries" ADD COLUMN "smsNotificationsOptInSource" TEXT;
ALTER TABLE "vehicle_sale_inquiries" ADD COLUMN "smsNotificationsOptInPhone" TEXT;
ALTER TABLE "vehicle_sale_inquiries" ADD COLUMN "smsNotificationsOptInIpAddress" TEXT;
ALTER TABLE "vehicle_sale_inquiries" ADD COLUMN "smsNotificationsOptInUserAgent" TEXT;
ALTER TABLE "vehicle_sale_inquiries" ADD COLUMN "smsNotificationsOptOutAt" TIMESTAMP(3);
ALTER TABLE "vehicle_sale_inquiries" ADD COLUMN "smsNotificationsConsentTextVersion" TEXT;

UPDATE "vehicle_sale_inquiries"
SET
  "smsNotificationsOptInSource" = 'buyer_interest_form',
  "smsNotificationsConsentTextVersion" = '2026-05-31-v1'
WHERE "smsNotificationsOptIn" = true;
