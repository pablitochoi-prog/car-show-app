-- Mark which master award categories support public SMS / QR voting.
ALTER TABLE "special_awards" ADD COLUMN IF NOT EXISTS "smsVotingEligible" BOOLEAN NOT NULL DEFAULT false;

UPDATE "special_awards"
SET "smsVotingEligible" = true
WHERE name IN ('People''s Choice', 'Kid''s Choice', 'Kids Choice');
