import { prisma } from "@/lib/db";
import { formatSmsNumberForDisplay } from "@/lib/sms/sms-number-display";

export { formatSmsNumberForDisplay, buildDashCardSmsLine } from "@/lib/sms/sms-number-display";

function envSmsNumber(): string | null {
  return (
    process.env.TWILIO_PHONE_NUMBER?.trim() ||
    process.env.NEXT_PUBLIC_SMS_VOTE_SHORT_CODE?.trim() ||
    null
  );
}

/** Ensure the platform shared SMS number exists (seeded from Twilio env). */
export async function ensureSharedSmsNumber(): Promise<string | null> {
  const fromEnv = envSmsNumber();
  if (!fromEnv) return null;

  await prisma.smsNumber.upsert({
    where: { phoneNumber: fromEnv },
    create: {
      provider: "TWILIO",
      phoneNumber: fromEnv,
      status: "ACTIVE",
    },
    update: { status: "ACTIVE" },
  });

  return fromEnv;
}

export async function getSharedSmsNumberDisplay(): Promise<string> {
  const active = await prisma.smsNumber.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: { phoneNumber: true },
  });
  if (active?.phoneNumber) {
    return formatSmsNumberForDisplay(active.phoneNumber);
  }
  const fromEnv = envSmsNumber();
  return fromEnv ? formatSmsNumberForDisplay(fromEnv) : "22333";
}
