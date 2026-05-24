import { prisma } from "@/lib/db";
import { LOCKED_PUBLIC_VOTE_AWARD_NAMES } from "@/lib/sms/public-vote-awards";

export type SmsVotingEligibleAward = {
  id: string;
  name: string;
  smsVotingEligible: boolean;
};

/** Keep People's Choice and Kid's Choice marked for public voting. */
export async function ensureLockedPublicVoteAwards(): Promise<void> {
  await prisma.specialAward.updateMany({
    where: { name: { in: [...LOCKED_PUBLIC_VOTE_AWARD_NAMES] } },
    data: { smsVotingEligible: true },
  });
}

export async function listSpecialAwardsForAdmin(): Promise<
  SmsVotingEligibleAward[]
> {
  await ensureLockedPublicVoteAwards();
  return prisma.specialAward.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, smsVotingEligible: true },
  });
}

/** Names of master awards organizers may offer for public SMS / QR voting. */
export async function listSmsVotingEligibleAwardNames(): Promise<string[]> {
  await ensureLockedPublicVoteAwards();
  const rows = await prisma.specialAward.findMany({
    where: { smsVotingEligible: true },
    orderBy: { sortOrder: "asc" },
    select: { name: true },
  });
  return rows.map((r) => r.name);
}
