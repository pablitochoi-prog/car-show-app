-- When organizers finalize all event voting (awards ceremony cutoff for public display).
ALTER TABLE "events" ADD COLUMN "eventAwardsVotingFinalizedAt" TIMESTAMP(3);

UPDATE "events"
SET "eventAwardsVotingFinalizedAt" = "updatedAt"
WHERE "eventAwardsVotingStatus" = 'FINALIZED'
  AND "eventAwardsVotingFinalizedAt" IS NULL;
