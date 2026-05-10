-- Add PAID_TIERED to RegistrationFeeType enum
ALTER TYPE "RegistrationFeeType" ADD VALUE IF NOT EXISTS 'PAID_TIERED';
