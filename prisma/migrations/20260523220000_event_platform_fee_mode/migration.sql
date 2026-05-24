-- Event-level platform fee mode: per-vehicle convenience vs flat event setup fee.
CREATE TYPE "EventPlatformFeeMode" AS ENUM ('CONVENIENCE', 'FLAT_EVENT');

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "platformFeeMode" "EventPlatformFeeMode" NOT NULL DEFAULT 'CONVENIENCE';
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "platformSetupFeeCollected" BOOLEAN NOT NULL DEFAULT false;
