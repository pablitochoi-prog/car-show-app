-- Allow registration/donation amounts with cents (e.g. $26.50).
ALTER TABLE "events" ALTER COLUMN "registrationFeeDollars" SET DATA TYPE DOUBLE PRECISION;
