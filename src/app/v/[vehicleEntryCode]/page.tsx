import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUserEventRoles } from "@/lib/event-staff";
import { JudgeScorePanel } from "@/components/vehicle-entry/judge-score-panel";
import { PublicVotePanel } from "@/components/vehicle-entry/public-vote-panel";
import { StaffVehicleHub } from "@/components/vehicle-entry/staff-vehicle-hub";
import { findVehicleEntryByCode } from "@/lib/vehicle-entry-lookup";
import {
  isJudgingOpenForEvent,
  resolveVehicleEntryVisitorRole,
} from "@/lib/vehicle-entry-access";
import { getJudgeScoreForEntry } from "@/lib/vehicle-judging";
import {
  entryAllowsPublicVoting,
  getVisitorPublicVoteContext,
  readVoterFingerprint,
} from "@/lib/vehicle-voting";

type Props = {
  params: Promise<{ vehicleEntryCode: string }>;
  searchParams: Promise<{ view?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vehicleEntryCode } = await params;
  const entry = await findVehicleEntryByCode(vehicleEntryCode);
  if (!entry) return { title: "Vehicle not found" };
  return {
    title: `${entry.vehicleEntryCode} | ${entry.event.name}`,
    description: `Vote or judge ${entry.make} ${entry.model} at ${entry.event.name}.`,
  };
}

export default async function VehicleEntrySmartRoutePage({
  params,
  searchParams,
}: Props) {
  const { vehicleEntryCode } = await params;
  const { view } = await searchParams;

  const entry = await findVehicleEntryByCode(vehicleEntryCode);
  if (!entry) notFound();

  const user = await getCurrentUser();
  const role = await resolveVehicleEntryVisitorRole(
    user?.id ?? null,
    entry.eventId,
    user?.platformRole,
  );

  const eventRoles = user
    ? await getUserEventRoles(user.id, entry.eventId)
    : [];
  const canJudge =
    eventRoles.includes("JUDGE") || user?.platformRole === "ADMIN";

  if (role === "organizer" && view !== "public" && view !== "judge") {
    return <StaffVehicleHub entry={entry} canJudge={canJudge} />;
  }

  if (role === "judge" || (role === "organizer" && view === "judge")) {
    if (!canJudge) {
      return (
        <StaffVehicleHub entry={entry} canJudge={false} />
      );
    }
    const existing = user
      ? await getJudgeScoreForEntry(
          entry.eventId,
          entry.vehicleEntryCode,
          user.id,
        )
      : null;
    return (
      <JudgeScorePanel
        entry={entry}
        judgingOpen={isJudgingOpenForEvent(entry.event.status)}
        initialScore={existing?.score ?? null}
        initialNotes={existing?.notes ?? null}
      />
    );
  }

  const fingerprint = await readVoterFingerprint();
  const voteContext = await getVisitorPublicVoteContext(entry, fingerprint);
  const votingOpen =
    entryAllowsPublicVoting(entry, entry.event.status) &&
    voteContext.hasAnyOpenCategory;

  return (
    <PublicVotePanel
      entry={entry}
      votingOpen={votingOpen}
      voteContext={voteContext}
    />
  );
}
