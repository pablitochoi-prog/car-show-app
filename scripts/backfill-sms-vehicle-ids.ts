/**
 * Run after migration: assigns smsVotePrefix to any event missing one,
 * assigns publicVehicleId to registration vehicle rows and guest JSON vehicles missing one,
 * syncs nextVehicleNumber.
 *
 * Usage: npx tsx scripts/backfill-sms-vehicle-ids.ts
 */
import { PrismaClient } from "@prisma/client";
import { backfillSmsVehicleIdsForAllEvents } from "../src/lib/event-sms-vehicle-id";

const prisma = new PrismaClient();

async function main() {
  await backfillSmsVehicleIdsForAllEvents(prisma);
  console.log("SMS / vehicle ID backfill complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
