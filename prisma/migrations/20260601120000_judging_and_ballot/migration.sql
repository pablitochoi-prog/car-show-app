-- Structured score sheet judging (Phase 1A) + assigned judge ballot voting (Phase 1B)

CREATE TYPE "JudgingMethodology" AS ENUM ('DEDUCTION', 'ADDITIVE', 'ORIGINALITY_CONDITION');
CREATE TYPE "JudgingDeductionBucket" AS ENUM ('ORIGINALITY', 'CONDITION');
CREATE TYPE "JudgeScoreSheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'FINALIZED');
CREATE TYPE "EventJudgingTemplateEditLock" AS ENUM ('OPEN', 'DRAFT_WARNING', 'LOCKED');
CREATE TYPE "JudgeBallotCategoryStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'FINALIZED');
CREATE TYPE "JudgeBallotAllocationStatus" AS ENUM ('ACTIVE', 'SUBMITTED', 'LOCKED');

CREATE TABLE "judging_templates" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "methodology" "JudgingMethodology" NOT NULL,
    "totalPoints" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "judging_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "judging_templates_slug_key" ON "judging_templates"("slug");

CREATE TABLE "judging_template_sections" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "weightPercent" DOUBLE PRECISION,
    "maxSectionPoints" INTEGER,
    "judgeGuidance" TEXT,
    CONSTRAINT "judging_template_sections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "judging_template_sections_templateId_sortOrder_idx" ON "judging_template_sections"("templateId", "sortOrder");

CREATE TABLE "judging_template_items" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "maxPoints" INTEGER NOT NULL,
    "judgeGuidance" TEXT,
    "requiresCommentOnDeduction" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "judging_template_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "judging_template_items_sectionId_sortOrder_idx" ON "judging_template_items"("sectionId", "sortOrder");

CREATE TABLE "judging_template_deduction_options" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "pointsDeducted" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deductionBucket" "JudgingDeductionBucket",
    CONSTRAINT "judging_template_deduction_options_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "judging_template_deduction_options_itemId_sortOrder_idx" ON "judging_template_deduction_options"("itemId", "sortOrder");

CREATE TABLE "event_judging_templates" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sourceTemplateId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "methodology" "JudgingMethodology" NOT NULL,
    "totalPoints" INTEGER NOT NULL,
    "editLock" "EventJudgingTemplateEditLock" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "event_judging_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "event_judging_templates_eventId_idx" ON "event_judging_templates"("eventId");

CREATE TABLE "event_judging_sections" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "weightPercent" DOUBLE PRECISION,
    "maxSectionPoints" INTEGER,
    "judgeGuidance" TEXT,
    CONSTRAINT "event_judging_sections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "event_judging_sections_templateId_sortOrder_idx" ON "event_judging_sections"("templateId", "sortOrder");

CREATE TABLE "event_judging_items" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "maxPoints" INTEGER NOT NULL,
    "judgeGuidance" TEXT,
    "requiresCommentOnDeduction" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "event_judging_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "event_judging_items_sectionId_sortOrder_idx" ON "event_judging_items"("sectionId", "sortOrder");

CREATE TABLE "event_judging_deduction_options" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "pointsDeducted" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deductionBucket" "JudgingDeductionBucket",
    CONSTRAINT "event_judging_deduction_options_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "event_judging_deduction_options_itemId_sortOrder_idx" ON "event_judging_deduction_options"("itemId", "sortOrder");

CREATE TABLE "event_judging_classes" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventCategoryId" TEXT NOT NULL,
    "eventJudgingTemplateId" TEXT NOT NULL,
    CONSTRAINT "event_judging_classes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_judging_classes_eventCategoryId_key" ON "event_judging_classes"("eventCategoryId");
CREATE INDEX "event_judging_classes_eventId_idx" ON "event_judging_classes"("eventId");

CREATE TABLE "judge_score_sheets" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventJudgingTemplateId" TEXT NOT NULL,
    "eventJudgingClassId" TEXT,
    "vehicleEntryCode" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "registrationVehicleId" TEXT,
    "judgeUserId" TEXT NOT NULL,
    "status" "JudgeScoreSheetStatus" NOT NULL DEFAULT 'DRAFT',
    "methodology" "JudgingMethodology" NOT NULL,
    "totalPoints" INTEGER NOT NULL,
    "finalScore" DOUBLE PRECISION,
    "originalityDeductions" INTEGER NOT NULL DEFAULT 0,
    "conditionDeductions" INTEGER NOT NULL DEFAULT 0,
    "generalNotes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "judge_score_sheets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "judge_score_sheets_eventId_vehicleEntryCode_judgeUserId_key" ON "judge_score_sheets"("eventId", "vehicleEntryCode", "judgeUserId");
CREATE INDEX "judge_score_sheets_eventId_eventJudgingTemplateId_idx" ON "judge_score_sheets"("eventId", "eventJudgingTemplateId");

CREATE TABLE "judge_score_sheet_sections" (
    "id" TEXT NOT NULL,
    "scoreSheetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "weightPercent" DOUBLE PRECISION,
    "maxSectionPoints" INTEGER,
    "judgeGuidance" TEXT,
    CONSTRAINT "judge_score_sheet_sections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "judge_score_sheet_sections_scoreSheetId_sortOrder_idx" ON "judge_score_sheet_sections"("scoreSheetId", "sortOrder");

CREATE TABLE "judge_score_sheet_items" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "maxPoints" INTEGER NOT NULL,
    "judgeGuidance" TEXT,
    "requiresCommentOnDeduction" BOOLEAN NOT NULL DEFAULT false,
    "awardedPoints" DOUBLE PRECISION,
    "itemNotes" TEXT,
    CONSTRAINT "judge_score_sheet_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "judge_score_sheet_items_sectionId_sortOrder_idx" ON "judge_score_sheet_items"("sectionId", "sortOrder");

CREATE TABLE "judge_score_sheet_deduction_options" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "pointsDeducted" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deductionBucket" "JudgingDeductionBucket",
    CONSTRAINT "judge_score_sheet_deduction_options_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "judge_score_sheet_deduction_options_itemId_sortOrder_idx" ON "judge_score_sheet_deduction_options"("itemId", "sortOrder");

CREATE TABLE "judge_score_sheet_deductions" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "optionId" TEXT,
    "label" TEXT NOT NULL,
    "pointsDeducted" INTEGER NOT NULL,
    "deductionBucket" "JudgingDeductionBucket",
    "comment" TEXT,
    CONSTRAINT "judge_score_sheet_deductions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "judge_score_sheet_deductions_itemId_idx" ON "judge_score_sheet_deductions"("itemId");

CREATE TABLE "judge_ballot_categories" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" "JudgeBallotCategoryStatus" NOT NULL DEFAULT 'DRAFT',
    "votesPerJudge" INTEGER NOT NULL,
    "maxVotesPerJudgePerVehicle" INTEGER NOT NULL DEFAULT 1,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "showResultsToJudges" BOOLEAN NOT NULL DEFAULT false,
    "judgeGuidance" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "judge_ballot_categories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "judge_ballot_categories_eventId_sortOrder_idx" ON "judge_ballot_categories"("eventId", "sortOrder");
CREATE INDEX "judge_ballot_categories_eventId_status_idx" ON "judge_ballot_categories"("eventId", "status");

CREATE TABLE "judge_ballot_eligible_classes" (
    "categoryId" TEXT NOT NULL,
    "eventCategoryId" TEXT NOT NULL,
    CONSTRAINT "judge_ballot_eligible_classes_pkey" PRIMARY KEY ("categoryId","eventCategoryId")
);

CREATE TABLE "judge_ballot_category_judges" (
    "categoryId" TEXT NOT NULL,
    "judgeUserId" TEXT NOT NULL,
    CONSTRAINT "judge_ballot_category_judges_pkey" PRIMARY KEY ("categoryId","judgeUserId")
);

CREATE TABLE "judge_ballot_allocations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "judgeUserId" TEXT NOT NULL,
    "totalVotesAllocated" INTEGER NOT NULL,
    "votesUsed" INTEGER NOT NULL DEFAULT 0,
    "status" "JudgeBallotAllocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "judge_ballot_allocations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "judge_ballot_allocations_categoryId_judgeUserId_key" ON "judge_ballot_allocations"("categoryId", "judgeUserId");
CREATE INDEX "judge_ballot_allocations_eventId_judgeUserId_idx" ON "judge_ballot_allocations"("eventId", "judgeUserId");

CREATE TABLE "judge_ballot_votes" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "judgeUserId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "registrationVehicleId" TEXT,
    "vehicleEntryCode" TEXT NOT NULL,
    "voteCount" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "judge_ballot_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "judge_ballot_votes_categoryId_judgeUserId_vehicleEntryCode_key" ON "judge_ballot_votes"("categoryId", "judgeUserId", "vehicleEntryCode");
CREATE INDEX "judge_ballot_votes_categoryId_vehicleEntryCode_idx" ON "judge_ballot_votes"("categoryId", "vehicleEntryCode");
CREATE INDEX "judge_ballot_votes_eventId_categoryId_idx" ON "judge_ballot_votes"("eventId", "categoryId");

-- Foreign keys
ALTER TABLE "judging_template_sections" ADD CONSTRAINT "judging_template_sections_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "judging_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judging_template_items" ADD CONSTRAINT "judging_template_items_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "judging_template_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judging_template_deduction_options" ADD CONSTRAINT "judging_template_deduction_options_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "judging_template_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_judging_templates" ADD CONSTRAINT "event_judging_templates_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_judging_templates" ADD CONSTRAINT "event_judging_templates_sourceTemplateId_fkey" FOREIGN KEY ("sourceTemplateId") REFERENCES "judging_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_judging_sections" ADD CONSTRAINT "event_judging_sections_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "event_judging_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_judging_items" ADD CONSTRAINT "event_judging_items_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "event_judging_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_judging_deduction_options" ADD CONSTRAINT "event_judging_deduction_options_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "event_judging_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_judging_classes" ADD CONSTRAINT "event_judging_classes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_judging_classes" ADD CONSTRAINT "event_judging_classes_eventCategoryId_fkey" FOREIGN KEY ("eventCategoryId") REFERENCES "event_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_judging_classes" ADD CONSTRAINT "event_judging_classes_eventJudgingTemplateId_fkey" FOREIGN KEY ("eventJudgingTemplateId") REFERENCES "event_judging_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judge_score_sheets" ADD CONSTRAINT "judge_score_sheets_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judge_score_sheets" ADD CONSTRAINT "judge_score_sheets_eventJudgingTemplateId_fkey" FOREIGN KEY ("eventJudgingTemplateId") REFERENCES "event_judging_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judge_score_sheets" ADD CONSTRAINT "judge_score_sheets_eventJudgingClassId_fkey" FOREIGN KEY ("eventJudgingClassId") REFERENCES "event_judging_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "judge_score_sheets" ADD CONSTRAINT "judge_score_sheets_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judge_score_sheets" ADD CONSTRAINT "judge_score_sheets_registrationVehicleId_fkey" FOREIGN KEY ("registrationVehicleId") REFERENCES "registration_vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "judge_score_sheets" ADD CONSTRAINT "judge_score_sheets_judgeUserId_fkey" FOREIGN KEY ("judgeUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judge_score_sheet_sections" ADD CONSTRAINT "judge_score_sheet_sections_scoreSheetId_fkey" FOREIGN KEY ("scoreSheetId") REFERENCES "judge_score_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judge_score_sheet_items" ADD CONSTRAINT "judge_score_sheet_items_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "judge_score_sheet_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judge_score_sheet_deduction_options" ADD CONSTRAINT "judge_score_sheet_deduction_options_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "judge_score_sheet_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judge_score_sheet_deductions" ADD CONSTRAINT "judge_score_sheet_deductions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "judge_score_sheet_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judge_ballot_categories" ADD CONSTRAINT "judge_ballot_categories_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judge_ballot_eligible_classes" ADD CONSTRAINT "judge_ballot_eligible_classes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "judge_ballot_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judge_ballot_eligible_classes" ADD CONSTRAINT "judge_ballot_eligible_classes_eventCategoryId_fkey" FOREIGN KEY ("eventCategoryId") REFERENCES "event_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judge_ballot_category_judges" ADD CONSTRAINT "judge_ballot_category_judges_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "judge_ballot_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judge_ballot_category_judges" ADD CONSTRAINT "judge_ballot_category_judges_judgeUserId_fkey" FOREIGN KEY ("judgeUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judge_ballot_allocations" ADD CONSTRAINT "judge_ballot_allocations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judge_ballot_allocations" ADD CONSTRAINT "judge_ballot_allocations_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "judge_ballot_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judge_ballot_allocations" ADD CONSTRAINT "judge_ballot_allocations_judgeUserId_fkey" FOREIGN KEY ("judgeUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judge_ballot_votes" ADD CONSTRAINT "judge_ballot_votes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judge_ballot_votes" ADD CONSTRAINT "judge_ballot_votes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "judge_ballot_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judge_ballot_votes" ADD CONSTRAINT "judge_ballot_votes_judgeUserId_fkey" FOREIGN KEY ("judgeUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judge_ballot_votes" ADD CONSTRAINT "judge_ballot_votes_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "judge_ballot_votes" ADD CONSTRAINT "judge_ballot_votes_registrationVehicleId_fkey" FOREIGN KEY ("registrationVehicleId") REFERENCES "registration_vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
