-- Event SMS voting settings
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "smsVotingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "smsVotingStartsAt" TIMESTAMP(3);
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "smsVotingEndsAt" TIMESTAMP(3);

CREATE TYPE "SmsProvider" AS ENUM ('TWILIO', 'TELNYX');
CREATE TYPE "SmsNumberStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "SmsVoteSessionStatus" AS ENUM ('PENDING_CATEGORY', 'COMPLETED', 'EXPIRED');

-- Platform SMS number
CREATE TABLE IF NOT EXISTS "sms_numbers" (
    "id" TEXT NOT NULL,
    "provider" "SmsProvider" NOT NULL DEFAULT 'TWILIO',
    "phoneNumber" TEXT NOT NULL,
    "status" "SmsNumberStatus" NOT NULL DEFAULT 'ACTIVE',
    "webhookUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_numbers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sms_numbers_phoneNumber_key" ON "sms_numbers"("phoneNumber");

-- Event voting categories (SMS award choices)
CREATE TABLE IF NOT EXISTS "voting_categories" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "smsOptionNumber" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "votingStartsAt" TIMESTAMP(3),
    "votingEndsAt" TIMESTAMP(3),
    "maxVotesPerPhone" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voting_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "voting_categories_eventId_smsOptionNumber_key"
    ON "voting_categories"("eventId", "smsOptionNumber");
CREATE INDEX IF NOT EXISTS "voting_categories_eventId_isActive_idx"
    ON "voting_categories"("eventId", "isActive");

ALTER TABLE "voting_categories" ADD CONSTRAINT "voting_categories_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Pending SMS vote sessions
CREATE TABLE IF NOT EXISTS "sms_vote_sessions" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "vehicleEntryCode" TEXT NOT NULL,
    "registrationId" TEXT,
    "registrationVehicleId" TEXT,
    "fromPhoneHash" TEXT NOT NULL,
    "provider" "SmsProvider" NOT NULL,
    "providerMessageId" TEXT,
    "status" "SmsVoteSessionStatus" NOT NULL DEFAULT 'PENDING_CATEGORY',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_vote_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "sms_vote_sessions_fromPhoneHash_status_expiresAt_idx"
    ON "sms_vote_sessions"("fromPhoneHash", "status", "expiresAt");
CREATE INDEX IF NOT EXISTS "sms_vote_sessions_eventId_fromPhoneHash_idx"
    ON "sms_vote_sessions"("eventId", "fromPhoneHash");

ALTER TABLE "sms_vote_sessions" ADD CONSTRAINT "sms_vote_sessions_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recorded SMS votes
CREATE TABLE IF NOT EXISTS "sms_votes" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "votingCategoryId" TEXT NOT NULL,
    "vehicleEntryCode" TEXT NOT NULL,
    "registrationId" TEXT,
    "registrationVehicleId" TEXT,
    "fromPhoneHash" TEXT NOT NULL,
    "provider" "SmsProvider" NOT NULL,
    "providerMessageId" TEXT,
    "rawBody" TEXT NOT NULL,
    "normalizedVoteCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sms_votes_eventId_votingCategoryId_fromPhoneHash_key"
    ON "sms_votes"("eventId", "votingCategoryId", "fromPhoneHash");
CREATE INDEX IF NOT EXISTS "sms_votes_eventId_vehicleEntryCode_idx"
    ON "sms_votes"("eventId", "vehicleEntryCode");
CREATE INDEX IF NOT EXISTS "sms_votes_provider_providerMessageId_idx"
    ON "sms_votes"("provider", "providerMessageId");

ALTER TABLE "sms_votes" ADD CONSTRAINT "sms_votes_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sms_votes" ADD CONSTRAINT "sms_votes_votingCategoryId_fkey"
    FOREIGN KEY ("votingCategoryId") REFERENCES "voting_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
