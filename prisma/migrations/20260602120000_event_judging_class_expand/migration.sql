-- Expand EventJudgingClass for Phase 2D score sheet template builder.

-- Drop old 1:1 vehicle class mapping (no production data expected pre-2D).
ALTER TABLE "event_judging_classes" DROP CONSTRAINT IF EXISTS "event_judging_classes_eventCategoryId_fkey";
DROP INDEX IF EXISTS "event_judging_classes_eventCategoryId_key";
ALTER TABLE "event_judging_classes" DROP COLUMN IF EXISTS "eventCategoryId";

ALTER TABLE "event_judging_classes" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "event_judging_classes" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "event_judging_classes" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "event_judging_classes" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "event_judging_classes" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "event_judging_classes" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "event_judging_classes" SET "name" = 'Judging Class' WHERE "name" IS NULL;
ALTER TABLE "event_judging_classes" ALTER COLUMN "name" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "event_judging_classes_eventId_sortOrder_idx"
  ON "event_judging_classes"("eventId", "sortOrder");

CREATE TABLE IF NOT EXISTS "event_judging_class_eligible_categories" (
    "id" TEXT NOT NULL,
    "eventJudgingClassId" TEXT NOT NULL,
    "eventCategoryId" TEXT NOT NULL,

    CONSTRAINT "event_judging_class_eligible_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "event_judging_class_eligible_categories_eventCategoryId_key"
  ON "event_judging_class_eligible_categories"("eventCategoryId");

CREATE INDEX IF NOT EXISTS "event_judging_class_eligible_categories_eventJudgingClassId_idx"
  ON "event_judging_class_eligible_categories"("eventJudgingClassId");

ALTER TABLE "event_judging_class_eligible_categories"
  ADD CONSTRAINT "event_judging_class_eligible_categories_eventJudgingClassId_fkey"
  FOREIGN KEY ("eventJudgingClassId") REFERENCES "event_judging_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_judging_class_eligible_categories"
  ADD CONSTRAINT "event_judging_class_eligible_categories_eventCategoryId_fkey"
  FOREIGN KEY ("eventCategoryId") REFERENCES "event_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
