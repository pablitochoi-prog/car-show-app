-- Charity logo for public event page (stored in public bucket).
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "charityLogoUrl" TEXT;
