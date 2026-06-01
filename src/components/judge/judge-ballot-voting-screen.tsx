"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Minus,
  Plus,
  Trash2,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JudgeBallotStatusBadge } from "@/components/judge/judge-ballot-status-badge";
import {
  maxAddableVotes,
  validateClientBallotVoteChange,
} from "@/lib/judging/judge-ballot-client-validation";
import type { JudgeBallotCategoryDetail } from "@/lib/judging/judge-ballot-judge-data";
import { normalizeVehicleEntryCode } from "@/lib/vehicle-entry-code";

type SaveState = "idle" | "saving" | "saved" | "error" | "offline";

type VehiclePreview = {
  vehicleEntryCode: string;
  nickname: string | null;
  year: number;
  make: string;
  model: string;
  classLabel: string;
  eventCategoryId: string | null;
  eligible: boolean;
};

export function JudgeBallotVotingScreen({
  eventId,
  categoryId,
}: {
  eventId: string;
  categoryId: string;
}) {
  const [detail, setDetail] = useState<JudgeBallotCategoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [guidanceOpen, setGuidanceOpen] = useState(false);
  const [entryInput, setEntryInput] = useState("");
  const [addVoteCount, setAddVoteCount] = useState(1);
  const [preview, setPreview] = useState<VehiclePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [actionError, setActionError] = useState("");
  const [busyCode, setBusyCode] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(
        `/api/judge/events/${eventId}/ballot/${categoryId}`,
        { credentials: "same-origin" },
      );
      const data = (await res.json()) as JudgeBallotCategoryDetail & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load ballot.");
      setDetail(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [eventId, categoryId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  async function lookupVehicle() {
    const code = normalizeVehicleEntryCode(entryInput);
    if (!code) {
      setPreviewError("Enter a valid vehicle entry code.");
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    setPreviewError("");
    setPreview(null);
    try {
      const res = await fetch(
        `/api/judge/events/${eventId}/vehicle-entry?code=${encodeURIComponent(code)}&categoryId=${encodeURIComponent(categoryId)}`,
        { credentials: "same-origin" },
      );
      const data = (await res.json()) as {
        preview?: VehiclePreview;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Vehicle not found.");
      setPreview(data.preview ?? null);
      if (data.preview && !data.preview.eligible) {
        setPreviewError("This vehicle is not eligible for this award category.");
      }
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "Lookup failed.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function saveVote(
    vehicleEntryCode: string,
    voteCount: number,
  ): Promise<boolean> {
    if (!detail?.canEdit) {
      setActionError("This award category is closed — votes cannot be changed.");
      return false;
    }

    setBusyCode(vehicleEntryCode);
    setSaveState("saving");
    setActionError("");

    const categoryRules = {
      status: detail.category.status,
      votesPerJudge: detail.category.votesPerJudge,
      maxVotesPerJudgePerVehicle: detail.category.maxVotesPerJudgePerVehicle,
      eligibleEventCategoryIds: detail.category.eligibleEventCategoryIds,
    };

    const existingVotes = detail.votes.map((v) => ({
      vehicleEntryCode: v.vehicleEntryCode,
      voteCount: v.voteCount,
    }));

    const row = detail.votes.find(
      (v) => v.vehicleEntryCode === vehicleEntryCode,
    );
    const clientCheck = validateClientBallotVoteChange({
      category: categoryRules,
      vehicleEntryCode,
      vehicleEventCategoryId:
        row?.eventCategoryId ?? preview?.eventCategoryId ?? null,
      proposedVoteCount: voteCount,
      existingVotes,
    });
    if (!clientCheck.ok) {
      setActionError(clientCheck.message);
      setSaveState("error");
      setBusyCode(null);
      return false;
    }

    try {
      const res = await fetch(
        `/api/judge/events/${eventId}/ballot/${categoryId}/votes`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ vehicleEntryCode, voteCount }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed.");

      setSaveState("saved");
      setActionError("");
      await loadDetail();
      setTimeout(() => setSaveState("idle"), 2000);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed.";
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      setSaveState(offline ? "offline" : "error");
      setActionError(
        offline
          ? "You appear to be offline. Check your connection and try again."
          : msg,
      );
    } finally {
      setBusyCode(null);
    }
    return false;
  }

  async function handleAddVotes() {
    if (!preview) return;
    const ok = await saveVote(preview.vehicleEntryCode, addVoteCount);
    if (ok) {
      setEntryInput("");
      setPreview(null);
      setAddVoteCount(1);
      setPreviewError("");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        Loading ballot…
      </div>
    );
  }

  if (error || !detail) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error || "Ballot not found."}
      </p>
    );
  }

  const { category, allocation, votes, canEdit } = detail;
  const closedMessage =
    category.status === "FINALIZED"
      ? "This award category is finalized. You can view your ballot but cannot make changes."
      : category.status === "CLOSED"
        ? "This award category is closed. You can view your ballot but cannot make changes."
        : null;

  const categoryRules = {
    status: category.status,
    votesPerJudge: category.votesPerJudge,
    maxVotesPerJudgePerVehicle: category.maxVotesPerJudgePerVehicle,
    eligibleEventCategoryIds: category.eligibleEventCategoryIds,
  };

  const existingVoteRows = votes.map((v) => ({
    vehicleEntryCode: v.vehicleEntryCode,
    voteCount: v.voteCount,
  }));

  const useAllCount =
    preview && canEdit
      ? maxAddableVotes({
          category: categoryRules,
          vehicleEntryCode: preview.vehicleEntryCode,
          vehicleEventCategoryId: preview.eventCategoryId,
          existingVotes: existingVoteRows,
          currentVehicleVotes: 0,
        })
      : 0;

  return (
    <div className="pb-28">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold">{category.name}</h2>
          <JudgeBallotStatusBadge status={category.status} />
        </div>

        {closedMessage ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
            {closedMessage}
          </p>
        ) : null}

        {category.judgeGuidance ? (
          <Card>
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
              onClick={() => setGuidanceOpen((o) => !o)}
            >
              Judge guidance
              {guidanceOpen ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </button>
            {guidanceOpen ? (
              <CardContent className="border-t pt-3 text-sm text-muted-foreground">
                {category.judgeGuidance}
              </CardContent>
            ) : null}
          </Card>
        ) : null}

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <p className="text-3xl font-bold tabular-nums text-primary">
              {allocation.votesRemaining}
            </p>
            <p className="text-sm text-muted-foreground">
              vote{allocation.votesRemaining === 1 ? "" : "s"} remaining of{" "}
              {allocation.totalVotesAllocated}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Max {category.maxVotesPerJudgePerVehicle} per vehicle · Eligible:{" "}
              {category.eligibleClassesSummary}
            </p>
          </CardContent>
        </Card>

        {canEdit ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Add vehicle vote</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="entry-code">Vehicle entry code</Label>
                <Input
                  id="entry-code"
                  value={entryInput}
                  onChange={(e) => {
                    setEntryInput(e.target.value.toUpperCase());
                    setPreview(null);
                    setPreviewError("");
                  }}
                  placeholder="e.g. AXY-004"
                  className="h-12 text-lg font-mono uppercase"
                  autoCapitalize="characters"
                  autoComplete="off"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="h-12 w-full text-base"
                disabled={previewLoading}
                onClick={() => void lookupVehicle()}
              >
                {previewLoading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Look up vehicle
              </Button>

              {previewError ? (
                <p className="text-sm text-destructive">{previewError}</p>
              ) : null}

              {preview ? (
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <p className="font-mono font-semibold">
                    {preview.vehicleEntryCode}
                  </p>
                  {preview.nickname ? (
                    <p className="font-medium">{preview.nickname}</p>
                  ) : null}
                  <p className="text-muted-foreground">
                    {preview.year} {preview.make} {preview.model}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {preview.classLabel}
                  </p>
                  {!preview.eligible ? (
                    <p className="mt-2 text-destructive">
                      Not eligible for this award category.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-center gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          className="size-12 rounded-full"
                          disabled={addVoteCount <= 1}
                          onClick={() =>
                            setAddVoteCount((c) => Math.max(1, c - 1))
                          }
                        >
                          <Minus className="size-5" />
                        </Button>
                        <span className="min-w-12 text-center text-2xl font-bold tabular-nums">
                          {addVoteCount}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          className="size-12 rounded-full"
                          disabled={
                            addVoteCount >= category.maxVotesPerJudgePerVehicle
                          }
                          onClick={() =>
                            setAddVoteCount((c) =>
                              Math.min(
                                category.maxVotesPerJudgePerVehicle,
                                c + 1,
                              ),
                            )
                          }
                        >
                          <Plus className="size-5" />
                        </Button>
                      </div>
                      {useAllCount > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full text-sm"
                          onClick={() => setAddVoteCount(useAllCount)}
                        >
                          Use all remaining votes ({useAllCount} max)
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        className="h-12 w-full text-base"
                        disabled={!preview.eligible || saveState === "saving"}
                        onClick={() => void handleAddVotes()}
                      >
                        Add {addVoteCount} vote{addVoteCount === 1 ? "" : "s"}
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {actionError ? (
          <p className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {saveState === "offline" ? (
              <WifiOff className="mt-0.5 size-4 shrink-0" />
            ) : null}
            {actionError}
          </p>
        ) : null}

        <BallotVoteList
          votes={votes}
          canEdit={canEdit}
          busyCode={busyCode}
          maxPerVehicle={category.maxVotesPerJudgePerVehicle}
          votesRemaining={allocation.votesRemaining}
          onSave={(code, count) => void saveVote(code, count)}
        />
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div>
            <p className="text-lg font-bold tabular-nums text-primary">
              {allocation.votesRemaining} left
            </p>
            <p className="text-xs text-muted-foreground">
              {saveState === "saving"
                ? "Saving…"
                : saveState === "saved"
                  ? "Saved"
                  : saveState === "offline"
                    ? "Offline"
                    : "Auto-saves on change"}
            </p>
          </div>
          <Link
            href={`/judge/events/${eventId}/ballot`}
            className="inline-flex h-11 items-center rounded-lg border px-4 text-sm font-medium"
          >
            Categories
          </Link>
        </div>
      </footer>
    </div>
  );
}

function BallotVoteList({
  votes,
  canEdit,
  busyCode,
  maxPerVehicle,
  votesRemaining,
  onSave,
}: {
  votes: JudgeBallotCategoryDetail["votes"];
  canEdit: boolean;
  busyCode: string | null;
  maxPerVehicle: number;
  votesRemaining: number;
  onSave: (code: string, count: number) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Your ballot ({votes.length} vehicle{votes.length === 1 ? "" : "s"})
      </h3>
      {votes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No votes yet. Look up a vehicle above to add votes.
        </p>
      ) : (
        <ul className="space-y-3">
          {votes.map((row) => {
            const isBusy = busyCode === row.vehicleEntryCode;
            return (
              <li key={row.vehicleEntryCode}>
                <Card>
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono font-semibold">
                          {row.vehicleEntryCode}
                        </p>
                        {row.nickname ? (
                          <p className="truncate font-medium">{row.nickname}</p>
                        ) : null}
                        <p className="text-sm text-muted-foreground">
                          {row.year} {row.make} {row.model}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.classLabel}
                        </p>
                      </div>
                      {canEdit ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="size-10 shrink-0 text-destructive"
                          disabled={isBusy}
                          aria-label="Remove all votes"
                          onClick={() => onSave(row.vehicleEntryCode, 0)}
                        >
                          {isBusy ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">Votes</span>
                      <div className="flex items-center gap-3">
                        {canEdit ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="size-12 rounded-full"
                            disabled={isBusy || row.voteCount <= 0}
                            onClick={() =>
                              onSave(row.vehicleEntryCode, row.voteCount - 1)
                            }
                          >
                            <Minus className="size-5" />
                          </Button>
                        ) : null}
                        <span className="min-w-8 text-center text-xl font-bold tabular-nums">
                          {isBusy ? (
                            <Loader2 className="mx-auto size-5 animate-spin" />
                          ) : (
                            row.voteCount
                          )}
                        </span>
                        {canEdit ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="size-12 rounded-full"
                            disabled={
                              isBusy ||
                              row.voteCount >= maxPerVehicle ||
                              votesRemaining <= 0
                            }
                            onClick={() =>
                              onSave(row.vehicleEntryCode, row.voteCount + 1)
                            }
                          >
                            <Plus className="size-5" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
