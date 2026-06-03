-- Phase 5A: scorecard template metadata (categories/subcategories/increment levels)

CREATE TYPE "JudgingSubcategoryScoringType" AS ENUM ('FULL', 'LEVELS', 'DISCRETIONARY');
CREATE TYPE "JudgingSubcategoryPointType" AS ENUM ('ADD', 'DEDUCT');

ALTER TABLE "judging_templates" ADD COLUMN IF NOT EXISTS "scoringGroup" TEXT;
ALTER TABLE "judging_templates" ADD COLUMN IF NOT EXISTS "vehicleType" TEXT;

ALTER TABLE "judging_template_sections" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "judging_template_items" ADD COLUMN IF NOT EXISTS "isIndented" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "judging_template_items" ADD COLUMN IF NOT EXISTS "pointType" "JudgingSubcategoryPointType";
ALTER TABLE "judging_template_items" ADD COLUMN IF NOT EXISTS "scoringType" "JudgingSubcategoryScoringType" NOT NULL DEFAULT 'LEVELS';
ALTER TABLE "judging_template_items" ADD COLUMN IF NOT EXISTS "allowMultipleViolations" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "judging_template_items" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "event_judging_templates" ADD COLUMN IF NOT EXISTS "scoringGroup" TEXT;
ALTER TABLE "event_judging_templates" ADD COLUMN IF NOT EXISTS "vehicleType" TEXT;

ALTER TABLE "event_judging_sections" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "event_judging_items" ADD COLUMN IF NOT EXISTS "isIndented" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_judging_items" ADD COLUMN IF NOT EXISTS "pointType" "JudgingSubcategoryPointType";
ALTER TABLE "event_judging_items" ADD COLUMN IF NOT EXISTS "scoringType" "JudgingSubcategoryScoringType" NOT NULL DEFAULT 'LEVELS';
ALTER TABLE "event_judging_items" ADD COLUMN IF NOT EXISTS "allowMultipleViolations" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_judging_items" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "judge_score_sheet_sections" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "judge_score_sheet_items" ADD COLUMN IF NOT EXISTS "isIndented" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "judge_score_sheet_items" ADD COLUMN IF NOT EXISTS "pointType" "JudgingSubcategoryPointType";
ALTER TABLE "judge_score_sheet_items" ADD COLUMN IF NOT EXISTS "scoringType" "JudgingSubcategoryScoringType" NOT NULL DEFAULT 'LEVELS';
ALTER TABLE "judge_score_sheet_items" ADD COLUMN IF NOT EXISTS "allowMultipleViolations" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "judge_score_sheet_items" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "judge_score_sheet_deductions" ADD COLUMN IF NOT EXISTS "violationCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "judge_score_sheet_deductions" ADD COLUMN IF NOT EXISTS "discretionaryPoints" INTEGER;
