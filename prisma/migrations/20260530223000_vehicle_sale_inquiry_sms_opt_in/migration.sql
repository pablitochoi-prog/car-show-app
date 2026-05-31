-- AlterTable
ALTER TABLE "vehicle_sale_inquiries" ADD COLUMN "buyerSmsOptIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "vehicle_sale_inquiries" ADD COLUMN "buyerSmsOptInAt" TIMESTAMP(3);
