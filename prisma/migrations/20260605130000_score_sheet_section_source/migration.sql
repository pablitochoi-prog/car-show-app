-- Link score sheet sections to event template sections (Phase 5E assignment mapping)

ALTER TABLE "judge_score_sheet_sections" ADD COLUMN "eventJudgingSectionId" TEXT;

CREATE INDEX "judge_score_sheet_sections_eventJudgingSectionId_idx"
    ON "judge_score_sheet_sections"("eventJudgingSectionId");

ALTER TABLE "judge_score_sheet_sections" ADD CONSTRAINT "judge_score_sheet_sections_eventJudgingSectionId_fkey"
    FOREIGN KEY ("eventJudgingSectionId") REFERENCES "event_judging_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
