/**
 * Idempotent backfill for VehicleEntryIndex from RegistrationVehicle rows and guest JSON.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/backfill-vehicle-entry-index.ts
 *   npx tsx --env-file=.env.local scripts/backfill-vehicle-entry-index.ts --dry-run
 */
import { PrismaClient } from "@prisma/client";
import { backfillVehicleEntryIndex } from "../src/lib/vehicle-entry-index";

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const stats = await backfillVehicleEntryIndex(prisma, { dryRun });

  console.log(
    JSON.stringify(
      {
        dryRun,
        registrationsScanned: stats.registrationsScanned,
        memberVehiclesScanned: stats.memberVehiclesScanned,
        guestVehiclesScanned: stats.guestVehiclesScanned,
        indexRecordsCreated: stats.indexRecordsCreated,
        indexRecordsUpdated: stats.indexRecordsUpdated,
        skippedRecords: stats.skippedRecords,
        errors: stats.errors,
        indexLookupAvailable: stats.indexLookupAvailable,
        warnings: stats.warnings,
        errorSummaries: stats.errorSummaries,
      },
      null,
      2,
    ),
  );

  if (stats.errors > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error("Vehicle entry index backfill failed.");
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
