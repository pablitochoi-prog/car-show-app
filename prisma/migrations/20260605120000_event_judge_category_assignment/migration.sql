-- Phase 5D: category-level judge assignments for structured score sheets

CREATE TYPE "EventJudgeCategoryAssignmentStatus" AS ENUM ('NOT_JUDGED', 'SAVED_FOR_LATER', 'SUBMITTED');

CREATE TABLE "event_judge_category_assignments" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventJudgingTemplateId" TEXT NOT NULL,
    "eventJudgingClassId" TEXT,
    "registrationVehicleId" TEXT NOT NULL,
    "vehicleEntryCode" TEXT NOT NULL,
    "judgeUserId" TEXT NOT NULL,
    "eventJudgingSectionId" TEXT NOT NULL,
    "status" "EventJudgeCategoryAssignmentStatus" NOT NULL DEFAULT 'NOT_JUDGED',
    "judgeScoreSheetId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedByUserId" TEXT NOT NULL,
    "reassignedFromJudgeUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_judge_category_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_judge_category_assignments_eventId_registrationVehicleId_eventJudgingSectionId_key"
    ON "event_judge_category_assignments"("eventId", "registrationVehicleId", "eventJudgingSectionId");

CREATE INDEX "event_judge_category_assignments_eventId_judgeUserId_idx"
    ON "event_judge_category_assignments"("eventId", "judgeUserId");

CREATE INDEX "event_judge_category_assignments_eventId_vehicleEntryCode_idx"
    ON "event_judge_category_assignments"("eventId", "vehicleEntryCode");

CREATE INDEX "event_judge_category_assignments_judgeScoreSheetId_idx"
    ON "event_judge_category_assignments"("judgeScoreSheetId");

ALTER TABLE "event_judge_category_assignments" ADD CONSTRAINT "event_judge_category_assignments_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_judge_category_assignments" ADD CONSTRAINT "event_judge_category_assignments_eventJudgingTemplateId_fkey"
    FOREIGN KEY ("eventJudgingTemplateId") REFERENCES "event_judging_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_judge_category_assignments" ADD CONSTRAINT "event_judge_category_assignments_eventJudgingClassId_fkey"
    FOREIGN KEY ("eventJudgingClassId") REFERENCES "event_judging_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "event_judge_category_assignments" ADD CONSTRAINT "event_judge_category_assignments_registrationVehicleId_fkey"
    FOREIGN KEY ("registrationVehicleId") REFERENCES "registration_vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_judge_category_assignments" ADD CONSTRAINT "event_judge_category_assignments_judgeUserId_fkey"
    FOREIGN KEY ("judgeUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_judge_category_assignments" ADD CONSTRAINT "event_judge_category_assignments_assignedByUserId_fkey"
    FOREIGN KEY ("assignedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_judge_category_assignments" ADD CONSTRAINT "event_judge_category_assignments_eventJudgingSectionId_fkey"
    FOREIGN KEY ("eventJudgingSectionId") REFERENCES "event_judging_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_judge_category_assignments" ADD CONSTRAINT "event_judge_category_assignments_judgeScoreSheetId_fkey"
    FOREIGN KEY ("judgeScoreSheetId") REFERENCES "judge_score_sheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
