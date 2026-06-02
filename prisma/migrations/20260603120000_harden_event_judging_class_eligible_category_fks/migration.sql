-- Idempotent hardening for junction FKs introduced in 20260602120000_event_judging_class_expand.
-- No-op when constraints already exist (production recovery, full dev apply).
-- Adds missing FKs only when partially applied or manually repaired schemas lack them.
-- Does not drop tables, columns, or data.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'event_judging_class_eligible_categories_eventJudgingClassId_fkey'
  ) THEN
    ALTER TABLE "event_judging_class_eligible_categories"
      ADD CONSTRAINT "event_judging_class_eligible_categories_eventJudgingClassId_fkey"
      FOREIGN KEY ("eventJudgingClassId") REFERENCES "event_judging_classes"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'event_judging_class_eligible_categories_eventCategoryId_fkey'
  ) THEN
    ALTER TABLE "event_judging_class_eligible_categories"
      ADD CONSTRAINT "event_judging_class_eligible_categories_eventCategoryId_fkey"
      FOREIGN KEY ("eventCategoryId") REFERENCES "event_categories"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "event_judging_class_eligible_categories_eventCategoryId_key"
  ON "event_judging_class_eligible_categories"("eventCategoryId");

CREATE INDEX IF NOT EXISTS "event_judging_class_eligible_categories_eventJudgingClassId_idx"
  ON "event_judging_class_eligible_categories"("eventJudgingClassId");
