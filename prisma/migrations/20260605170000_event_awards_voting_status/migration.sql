-- Organizer hub voting lifecycle (close / reopen / finalize all).

CREATE TYPE "EventAwardsVotingStatus" AS ENUM ('OPEN', 'CLOSED', 'FINALIZED');

ALTER TABLE "events" ADD COLUMN "eventAwardsVotingStatus" "EventAwardsVotingStatus" NOT NULL DEFAULT 'OPEN';
