import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUserEventRoles } from "@/lib/event-staff";
import { JudgeScorePanel } from "@/components/vehicle-entry/judge-score-panel";
import { ContextualHelpLink } from "@/components/help/contextual-help-link";
import { PublicVotePanel } from "@/components/vehicle-entry/public-vote-panel";
import { StaffVehicleHub } from "@/components/vehicle-entry/staff-vehicle-hub";
import { findVehicleEntryByCode } from "@/lib/vehicle-entry-lookup";
import {
  isJudgingOpenForEvent,
  resolveVehicleEntryVisitorRole,
} from "@/lib/vehicle-entry-access";
import { getJudgeScoreForEntry } from "@/lib/vehicle-judging";
import {
  loadVehicleBuyerInquiryNotice,
} from "@/lib/public-vehicle-sale-listing";
import {
  getVisitorPublicVoteContext,
  readVoterFingerprint,
  resolvePublicVotingPeriodStatus,
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

  // Judge scoring is opt-in (?view=judge). Dash-card QR /v/{code} defaults to public voting.
  if (view === "judge") {
    if (!canJudge) {
      return <StaffVehicleHub entry={entry} canJudge={false} />;
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
  const votingPeriodStatus = await resolvePublicVotingPeriodStatus(
    entry,
    voteContext,
  );
  const votingOpen =
    entry.votingStatus !== "CLOSED" && voteContext.hasAnyOpenCategory;
  const buyerInquiryNotice = await loadVehicleBuyerInquiryNotice(entry);

  return (
    <div className="space-y-4">
      <PublicVotePanel
        entry={entry}
        votingOpen={votingOpen}
        votingPeriodStatus={votingPeriodStatus}
        voteContext={voteContext}
        buyerInquiryNotice={buyerInquiryNotice}
      />
      <div className="page-shell max-w-lg space-y-2 pb-8 print:hidden">
        <ContextualHelpLink slug="scan-dash-card-qr-code" />
        <ContextualHelpLink slug="public-voting" />
      </div>
    </div>
  );
}
