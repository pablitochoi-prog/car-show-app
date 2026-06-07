"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readResponseJson } from "@/lib/read-response-json";
import type {
  EventVotingControlSnapshot,
  EventVotingMethodKey,
  VotingMethodControlAction,
} from "@/lib/judging/event-voting-control-types";
import {
  ballotVotingReportStatus,
  publicVotingReportStatus,
  scoreSheetReportStatus,
  type ReportVotingMethodStatus,
} from "@/lib/event-reports/voting-method-status-shared";

function methodStatus(
  method: EventVotingMethodKey,
  snapshot: EventVotingControlSnapshot,
): ReportVotingMethodStatus {
  switch (method) {
    case "public-voting":
      return publicVotingReportStatus(snapshot.publicVoting);
    case "judge-ballot":
      return ballotVotingReportStatus(snapshot.ballot);
    case "score-sheets":
      return scoreSheetReportStatus(snapshot.scoreSheet);
  }
}

function ctaLabel(status: ReportVotingMethodStatus): string | null {
  switch (status) {
    case "not_started":
      return "Open Voting";
    case "open":
      return "Close Voting";
    case "closed":
      return "Reopen voting";
  }
}

function ctaAction(status: ReportVotingMethodStatus): VotingMethodControlAction {
  switch (status) {
    case "not_started":
      return "open";
    case "open":
      return "close";
    case "closed":
      return "reopen";
  }
}

export function VotingMethodCta({
  eventId,
  method,
  snapshot: initialSnapshot,
  configured,
  onSnapshotChange,
}: {
  eventId: string;
  method: EventVotingMethodKey;
  snapshot: EventVotingControlSnapshot | null;
  configured: boolean;
  onSnapshotChange?: (snapshot: EventVotingControlSnapshot) => void;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  if (!snapshot || snapshot.overall === "FINALIZED") {
    return null;
  }

  if (!configured) {
    return (
      <Button
        type="button"
        variant="secondary"
        className="w-full justify-center"
        disabled
        aria-disabled="true"
      >
        Voting needs to be configured.
      </Button>
    );
  }

  const status = methodStatus(method, snapshot);
  const label = ctaLabel(status);
  if (!label) return null;

  async function run() {
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/voting-control`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "method_control",
          method,
          methodAction: ctaAction(status),
        }),
      });
      const parsed = await readResponseJson<{
        snapshot?: EventVotingControlSnapshot;
        error?: string;
      }>(res);
      if (!parsed.bodyIsJson) {
        throw new Error(
          parsed.rawPreview
            ? `Unexpected server response (${parsed.status}).`
            : "Action failed.",
        );
      }
      if (!res.ok) {
        throw new Error(parsed.data?.error ?? "Action failed.");
      }
      const next = parsed.data?.snapshot ?? null;
      if (next) {
        setSnapshot(next);
        onSnapshotChange?.(next);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="w-full space-y-1">
      <Button
        type="button"
        variant="secondary"
        className="w-full justify-center"
        disabled={acting}
        onClick={() => void run()}
      >
        {acting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        {label}
      </Button>
      {error ? (
        <p className="text-center text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
