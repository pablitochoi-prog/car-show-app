-- Unique car show number (EVT-1001, EVT-1002, …) for every event.

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "showNumber" INTEGER;

WITH numbered AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, id ASC) + 1000)::INTEGER AS num
  FROM "events"
  WHERE "showNumber" IS NULL
)
UPDATE "events" AS e
SET "showNumber" = numbered.num
FROM numbered
WHERE e.id = numbered.id;

ALTER TABLE "events" ALTER COLUMN "showNumber" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "events_showNumber_key" ON "events"("showNumber");

CREATE SEQUENCE IF NOT EXISTS event_show_number_seq;

SELECT setval(
  'event_show_number_seq',
  GREATEST(
    1000,
    COALESCE((SELECT MAX("showNumber") FROM "events"), 1000)
  )
);
