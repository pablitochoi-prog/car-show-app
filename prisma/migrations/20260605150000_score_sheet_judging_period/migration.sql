-- Event-wide score sheet judging period (end judging / finalize results).

CREATE TYPE "ScoreSheetJudgingPeriodStatus" AS ENUM ('OPEN', 'CLOSED', 'FINALIZED');

ALTER TABLE "events"
  ADD COLUMN "scoreSheetJudgingPeriodStatus" "ScoreSheetJudgingPeriodStatus" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "scoreSheetJudgingClosedAt" TIMESTAMP(3),
  ADD COLUMN "scoreSheetJudgingFinalizedAt" TIMESTAMP(3),
  ADD COLUMN "scoreSheetJudgingFinalizedByUserId" TEXT;
