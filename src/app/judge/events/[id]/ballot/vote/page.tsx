import { JudgeBallotVehicleVotingScreen } from "@/components/judge/judge-ballot-vehicle-voting-screen";
import { normalizeVehicleEntryCode } from "@/lib/vehicle-entry-code";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ code?: string }>;
};

export default async function JudgeBallotVehicleVotePage({
  params,
  searchParams,
}: Props) {
  const { id: eventId } = await params;
  const { code: rawCode } = await searchParams;
  const code = normalizeVehicleEntryCode(rawCode ?? "");

  if (!code) {
    return (
      <p className="text-sm text-destructive">
        Enter a vehicle ID from the Judge Ballot section on My Judging.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="text-xl font-bold">Ballot vote</h1>
      <JudgeBallotVehicleVotingScreen
        eventId={eventId}
        vehicleEntryCode={code}
      />
    </div>
  );
}
