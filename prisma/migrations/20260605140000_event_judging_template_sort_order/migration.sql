-- Add display order for event score sheet templates (organizer list + judging class order).
ALTER TABLE "event_judging_templates" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "event_judging_templates_eventId_sortOrder_idx"
  ON "event_judging_templates"("eventId", "sortOrder");

-- Backfill from creation order per event.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "eventId" ORDER BY "createdAt" ASC) - 1 AS rn
  FROM "event_judging_templates"
)
UPDATE "event_judging_templates" AS t
SET "sortOrder" = ranked.rn
FROM ranked
WHERE t.id = ranked.id;

-- Align judging class order with its template when linked.
UPDATE "event_judging_classes" AS c
SET "sortOrder" = t."sortOrder"
FROM "event_judging_templates" AS t
WHERE c."eventJudgingTemplateId" = t.id;
