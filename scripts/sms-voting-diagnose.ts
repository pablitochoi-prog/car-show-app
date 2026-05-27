/**
 * One-off diagnostic: SMS voting readiness for a vehicle code.
 * Usage: npx tsx --env-file=.env.local scripts/sms-voting-diagnose.ts 53X-006
 */
import { PrismaClient } from "@prisma/client";
import { isSmsVotingOpenForEvent } from "../src/lib/sms/voting-window";
import { normalizeVehicleEntryCodeFromSms } from "../src/lib/sms/normalize-vote-code";

const code = process.argv[2]?.trim().toUpperCase() ?? "53X-006";
const prisma = new PrismaClient();

async function main() {
  const normalized = normalizeVehicleEntryCodeFromSms(code);
  console.log("Input code:", code);
  console.log("Normalized:", normalized);

  const rv = await prisma.registrationVehicle.findFirst({
    where: { publicVehicleId: normalized ?? code },
    select: {
      publicVehicleId: true,
      registration: {
        select: {
          event: {
            select: {
              id: true,
              name: true,
              status: true,
              smsVotePrefix: true,
              smsVotingEnabled: true,
              smsVotingStartsAt: true,
              smsVotingEndsAt: true,
              votingCategories: {
                where: { isActive: true },
                select: { name: true, smsOptionNumber: true },
              },
            },
          },
        },
      },
    },
  });

  if (!rv) {
    console.log("\nVehicle not found in registration_vehicles.");
    return;
  }

  const event = rv.registration.event;
  const now = new Date();
  const open = isSmsVotingOpenForEvent(event, now);

  console.log("\nEvent:", event.name);
  console.log("Status:", event.status);
  console.log("SMS prefix:", event.smsVotePrefix);
  console.log("smsVotingEnabled:", event.smsVotingEnabled);
  console.log("Voting window:", event.smsVotingStartsAt, "→", event.smsVotingEndsAt);
  console.log("Voting open now:", open);
  console.log(
    "Active categories:",
    event.votingCategories.length,
    event.votingCategories.map((c) => `${c.smsOptionNumber}:${c.name}`).join(", ") ||
      "(none)",
  );

  const smsNumbers = await prisma.smsNumber.findMany();
  console.log("\nSMS numbers in DB:", smsNumbers.length);
  for (const n of smsNumbers) {
    console.log(`  ${n.phoneNumber} provider=${n.provider} status=${n.status}`);
  }

  const voteCount = await prisma.smsVote.count({
    where: { vehicleEntryCode: rv.publicVehicleId ?? code },
  });
  console.log("\nVotes recorded for this code:", voteCount);

  const hashSecret = process.env.SMS_PHONE_HASH_SECRET?.trim();
  console.log("\nSMS_PHONE_HASH_SECRET set:", Boolean(hashSecret));
  console.log("TWILIO_PHONE_NUMBER:", process.env.TWILIO_PHONE_NUMBER?.trim() ?? "(missing)");
  console.log(
    "Expected webhook:",
    `${process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "https://YOUR_APP_URL"}/api/sms/twilio/inbound`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
