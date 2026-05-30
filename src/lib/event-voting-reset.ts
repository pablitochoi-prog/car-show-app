import { prisma } from "@/lib/db";

export type EventVotingDataCounts = {
  webVotes: number;
  smsVotes: number;
  smsSessions: number;
};

export type EventVotingResetResult = EventVotingDataCounts;

export async function getEventVotingDataCounts(
  eventId: string,
): Promise<EventVotingDataCounts> {
  const [webVotes, smsVotes, smsSessions] = await Promise.all([
    prisma.vehiclePublicVote.count({ where: { eventId } }),
    prisma.smsVote.count({ where: { eventId } }),
    prisma.smsVoteSession.count({ where: { eventId } }),
  ]);
  return { webVotes, smsVotes, smsSessions };
}

/** Deletes all web, SMS, and pending SMS session votes for an event. */
export async function resetEventVotingData(
  eventId: string,
): Promise<EventVotingResetResult> {
  const before = await getEventVotingDataCounts(eventId);

  await prisma.$transaction([
    prisma.vehiclePublicVote.deleteMany({ where: { eventId } }),
    prisma.smsVote.deleteMany({ where: { eventId } }),
    prisma.smsVoteSession.deleteMany({ where: { eventId } }),
  ]);

  return before;
}
