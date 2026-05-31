-- CreateEnum
CREATE TYPE "VehicleSaleInquiryStatus" AS ENUM ('NEW', 'SENT_TO_OWNER', 'FAILED_TO_SEND', 'SPAM', 'ARCHIVED', 'CONTACTED');

-- AlterTable
ALTER TABLE "events" ADD COLUMN "vehicleSaleInquiriesEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "vehicle_sale_listings" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "registrationVehicleId" TEXT,
    "guestVehicleIndex" INTEGER,
    "sellerUserId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "askingPriceCents" INTEGER,
    "showAskingPricePublicly" BOOLEAN NOT NULL DEFAULT false,
    "allowOffers" BOOLEAN NOT NULL DEFAULT false,
    "minimumOfferCents" INTEGER,
    "description" TEXT,
    "sellerAcknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_sale_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_sale_photos" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "originalFilename" TEXT,
    "contentType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_sale_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_sale_inquiries" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sellerUserId" TEXT,
    "registrationVehicleId" TEXT,
    "guestVehicleIndex" INTEGER,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerPhone" TEXT,
    "offerAmountCents" INTEGER,
    "message" TEXT,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "status" "VehicleSaleInquiryStatus" NOT NULL DEFAULT 'NEW',
    "ipHash" TEXT,
    "userAgentHash" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notificationEmailSentAt" TIMESTAMP(3),
    "notificationSmsSentAt" TIMESTAMP(3),
    "contactedAt" TIMESTAMP(3),

    CONSTRAINT "vehicle_sale_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_sale_listings_registrationVehicleId_key" ON "vehicle_sale_listings"("registrationVehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_sale_listings_registrationId_guestVehicleIndex_key" ON "vehicle_sale_listings"("registrationId", "guestVehicleIndex");

-- CreateIndex
CREATE INDEX "vehicle_sale_listings_eventId_enabled_idx" ON "vehicle_sale_listings"("eventId", "enabled");

-- CreateIndex
CREATE INDEX "vehicle_sale_listings_sellerUserId_idx" ON "vehicle_sale_listings"("sellerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_sale_photos_objectKey_key" ON "vehicle_sale_photos"("objectKey");

-- CreateIndex
CREATE INDEX "vehicle_sale_photos_listingId_sortOrder_idx" ON "vehicle_sale_photos"("listingId", "sortOrder");

-- CreateIndex
CREATE INDEX "vehicle_sale_inquiries_listingId_submittedAt_idx" ON "vehicle_sale_inquiries"("listingId", "submittedAt");

-- CreateIndex
CREATE INDEX "vehicle_sale_inquiries_sellerUserId_status_idx" ON "vehicle_sale_inquiries"("sellerUserId", "status");

-- CreateIndex
CREATE INDEX "vehicle_sale_inquiries_eventId_idx" ON "vehicle_sale_inquiries"("eventId");

-- AddForeignKey
ALTER TABLE "vehicle_sale_listings" ADD CONSTRAINT "vehicle_sale_listings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_sale_listings" ADD CONSTRAINT "vehicle_sale_listings_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_sale_listings" ADD CONSTRAINT "vehicle_sale_listings_registrationVehicleId_fkey" FOREIGN KEY ("registrationVehicleId") REFERENCES "registration_vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_sale_listings" ADD CONSTRAINT "vehicle_sale_listings_sellerUserId_fkey" FOREIGN KEY ("sellerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_sale_photos" ADD CONSTRAINT "vehicle_sale_photos_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "vehicle_sale_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_sale_inquiries" ADD CONSTRAINT "vehicle_sale_inquiries_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "vehicle_sale_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_sale_inquiries" ADD CONSTRAINT "vehicle_sale_inquiries_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_sale_inquiries" ADD CONSTRAINT "vehicle_sale_inquiries_sellerUserId_fkey" FOREIGN KEY ("sellerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
