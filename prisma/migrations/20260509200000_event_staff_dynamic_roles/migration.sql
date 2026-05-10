-- Event-scoped role definitions + staff membership + M:N role links.
-- Migrates data from legacy "event_staff" (one row per user per role enum).

-- CreateTable
CREATE TABLE "event_role_definitions" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "slug" TEXT,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_role_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_staff_members" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_staff_role_links" (
    "staffMemberId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "event_staff_role_links_pkey" PRIMARY KEY ("staffMemberId","roleId")
);

-- Foreign keys
ALTER TABLE "event_role_definitions" ADD CONSTRAINT "event_role_definitions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_staff_members" ADD CONSTRAINT "event_staff_members_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_staff_members" ADD CONSTRAINT "event_staff_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_staff_role_links" ADD CONSTRAINT "event_staff_role_links_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "event_staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_staff_role_links" ADD CONSTRAINT "event_staff_role_links_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "event_role_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique indexes (slug nullable: Postgres allows multiple NULLs in unique index)
CREATE UNIQUE INDEX "event_role_definitions_eventId_slug_key" ON "event_role_definitions"("eventId", "slug");

CREATE UNIQUE INDEX "event_role_definitions_eventId_name_key" ON "event_role_definitions"("eventId", "name");

CREATE UNIQUE INDEX "event_staff_members_eventId_userId_key" ON "event_staff_members"("eventId", "userId");

CREATE INDEX "event_role_definitions_eventId_idx" ON "event_role_definitions"("eventId");

CREATE INDEX "event_staff_members_eventId_idx" ON "event_staff_members"("eventId");

-- Seed default role definitions for every event
INSERT INTO "event_role_definitions" ("id", "eventId", "slug", "name", "isDefault", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, e."id", v.slug, v.name, true, v.sort_order, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "events" e
CROSS JOIN (VALUES
    ('organizer', 'Organizer', 0),
    ('treasurer', 'Treasurer', 1),
    ('registrar', 'Registrar', 2),
    ('judge', 'Judge', 3),
    ('marketing', 'Marketing', 4),
    ('volunteer', 'Volunteer', 5)
) AS v(slug, name, sort_order);

-- Migrate legacy staff rows -> one membership per (event, user)
INSERT INTO "event_staff_members" ("id", "eventId", "userId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, es."eventId", es."userId", MIN(es."createdAt"), CURRENT_TIMESTAMP
FROM "event_staff" es
GROUP BY es."eventId", es."userId";

-- Link roles from legacy enum rows
INSERT INTO "event_staff_role_links" ("staffMemberId", "roleId")
SELECT sm."id", rd."id"
FROM "event_staff" es
INNER JOIN "event_staff_members" sm
    ON sm."eventId" = es."eventId" AND sm."userId" = es."userId"
INNER JOIN "event_role_definitions" rd
    ON rd."eventId" = es."eventId"
    AND rd."slug" = (
        CASE es."role"::text
            WHEN 'ORGANIZER' THEN 'organizer'
            WHEN 'TREASURER' THEN 'treasurer'
            WHEN 'REGISTRAR' THEN 'registrar'
            WHEN 'JUDGE' THEN 'judge'
            WHEN 'MARKETING' THEN 'marketing'
            ELSE NULL
        END
    )
WHERE rd."slug" IS NOT NULL;

-- Drop legacy table and enum
DROP TABLE "event_staff";

DROP TYPE "EventRole";
