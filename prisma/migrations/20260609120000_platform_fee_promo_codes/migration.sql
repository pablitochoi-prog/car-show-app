-- CreateEnum
CREATE TYPE "PlatformFeePromoCodeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RESERVED', 'REDEEMED', 'EXPIRED', 'REVOKED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "platform_fee_promo_codes" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(16) NOT NULL,
    "status" "PlatformFeePromoCodeStatus" NOT NULL DEFAULT 'DRAFT',
    "expiresAt" TIMESTAMP(3),
    "internalNotes" TEXT,
    "reservedOrganizationName" TEXT,
    "reservedEventName" TEXT,
    "reservedEventState" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "redeemedByUserId" TEXT,
    "redeemedEventId" TEXT,
    "redeemedOrganizationName" TEXT,
    "redeemedEventName" TEXT,
    "redeemedEventState" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_fee_promo_codes_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "events" ADD COLUMN "platformFeePromoCodeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "platform_fee_promo_codes_code_key" ON "platform_fee_promo_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "platform_fee_promo_codes_redeemedEventId_key" ON "platform_fee_promo_codes"("redeemedEventId");

-- CreateIndex
CREATE INDEX "platform_fee_promo_codes_status_idx" ON "platform_fee_promo_codes"("status");

-- CreateIndex
CREATE INDEX "platform_fee_promo_codes_createdAt_idx" ON "platform_fee_promo_codes"("createdAt");

-- CreateIndex
CREATE INDEX "platform_fee_promo_codes_redeemedAt_idx" ON "platform_fee_promo_codes"("redeemedAt");

-- CreateIndex
CREATE UNIQUE INDEX "events_platformFeePromoCodeId_key" ON "events"("platformFeePromoCodeId");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_platformFeePromoCodeId_fkey" FOREIGN KEY ("platformFeePromoCodeId") REFERENCES "platform_fee_promo_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_fee_promo_codes" ADD CONSTRAINT "platform_fee_promo_codes_redeemedByUserId_fkey" FOREIGN KEY ("redeemedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_fee_promo_codes" ADD CONSTRAINT "platform_fee_promo_codes_redeemedEventId_fkey" FOREIGN KEY ("redeemedEventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_fee_promo_codes" ADD CONSTRAINT "platform_fee_promo_codes_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_fee_promo_codes" ADD CONSTRAINT "platform_fee_promo_codes_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
