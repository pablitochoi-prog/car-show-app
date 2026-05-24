-- Prisma expects PostgreSQL enum types; the initial SMS migration used TEXT columns.

CREATE TYPE "SmsProvider" AS ENUM ('TWILIO', 'TELNYX');
CREATE TYPE "SmsNumberStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "SmsVoteSessionStatus" AS ENUM ('PENDING_CATEGORY', 'COMPLETED', 'EXPIRED');

ALTER TABLE "sms_numbers"
  ALTER COLUMN "provider" DROP DEFAULT,
  ALTER COLUMN "provider" TYPE "SmsProvider" USING ("provider"::"SmsProvider"),
  ALTER COLUMN "provider" SET DEFAULT 'TWILIO';

ALTER TABLE "sms_numbers"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "SmsNumberStatus" USING ("status"::"SmsNumberStatus"),
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

ALTER TABLE "sms_vote_sessions"
  ALTER COLUMN "provider" TYPE "SmsProvider" USING ("provider"::"SmsProvider");

ALTER TABLE "sms_vote_sessions"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "SmsVoteSessionStatus" USING ("status"::"SmsVoteSessionStatus"),
  ALTER COLUMN "status" SET DEFAULT 'PENDING_CATEGORY';

ALTER TABLE "sms_votes"
  ALTER COLUMN "provider" TYPE "SmsProvider" USING ("provider"::"SmsProvider");
