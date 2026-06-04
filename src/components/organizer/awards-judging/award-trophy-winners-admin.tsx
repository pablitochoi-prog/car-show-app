"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Trophy } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { readResponseJson } from "@/lib/read-response-json";
import type {
  AwardTrophyWinnersPayload,
  TrophyAwardGroup,
  TrophyPlaceSlot,
  TrophyWinnerListVehicle,
} from "@/lib/judging/award-trophy-winners";

function VehicleGridCard({
  row,
  showExclude,
  acting,
  onExclude,
}: {
  row: TrophyWinnerListVehicle;
  showExclude: boolean;
  acting: boolean;
  onExclude?: () => void;
}) {
  const ymm = [row.year, row.make, row.model].filter(Boolean).join(" ");

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-3",
        row.isSelectedWinner && "border-primary/50 bg-primary/5",
      )}
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
        {row.photoUrl ? (
          <Image
            src={row.photoUrl}
            alt=""
            width={64}
            height={64}
            className="size-full object-cover"
            unoptimized
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
            No photo
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground">
            #{row.listPosition}
          </span>
          <span className="font-mono text-xs">{row.vehicleEntryCode}</span>
          {row.metricValue != null ? (
            <span className="text-xs font-medium">
              {row.metricLabel} {row.metricValue}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 font-medium leading-tight">{ymm || "Vehicle"}</p>
        <p className="text-sm text-muted-foreground">
          {row.ownerName ?? "Owner not listed"}
          {row.vehicleNickname ? ` · ${row.vehicleNickname}` : ""}
        </p>
        {row.isSelectedWinner ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {row.isAutoWinner ? (
              <Badge variant="default" className="text-xs">
                Trophy winner
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Selected alternate
              </Badge>
            )}
          </div>
        ) : (
          <Badge variant="outline" className="mt-1.5 text-xs">
            Alternate
          </Badge>
        )}
        {showExclude && onExclude ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 h-7 text-xs"
            disabled={acting}
            onClick={onExclude}
          >
            {acting ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              "Manually exclude"
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function PlaceWinnerBar({
  slot,
  acting,
  onExclude,
}: {
  slot: TrophyPlaceSlot;
  acting: boolean;
  onExclude: () => void;
}) {
  const w = slot.effectiveWinner;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
      <div>
        <span className="font-medium">{slot.placeLabel}:</span>{" "}
        {slot.isVacant || !w ? (
          <span className="text-muted-foreground">Vacant — assign alternate</span>
        ) : (
          <span>
            {w.vehicleEntryCode} · {[w.year, w.make, w.model].filter(Boolean).join(" ")}
            {w.ownerName ? ` · ${w.ownerName}` : ""}
          </span>
        )}
      </div>
      {!slot.isVacant && w ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={acting}
          onClick={onExclude}
        >
          Manually exclude
        </Button>
      ) : null}
    </div>
  );
}

function AwardGroupCard({
  eventId,
  group,
  winnersOnly,
  onUpdated,
}: {
  eventId: string;
  group: TrophyAwardGroup;
  winnersOnly: boolean;
  onUpdated: (payload: AwardTrophyWinnersPayload) => void;
}) {
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patchPlacement(body: Record<string, unknown>) {
    setActing(String(body.trophyEntryId ?? body.excludeWinner ?? "patch"));
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/award-trophy-winners`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const parsed = await readResponseJson<
        AwardTrophyWinnersPayload & { error?: string }
      >(res);
      if (!parsed.bodyIsJson || !parsed.data) {
        throw new Error(parsed.data?.error ?? "Update failed.");
      }
      if (!res.ok) {
        throw new Error(parsed.data?.error ?? "Update failed.");
      }
      onUpdated(parsed.data as AwardTrophyWinnersPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setActing(null);
    }
  }

  const gridRows: TrophyWinnerListVehicle[] = winnersOnly
    ? group.placeSlots.flatMap((slot) => {
        const code = slot.effectiveWinner?.vehicleEntryCode;
        if (!code) return [];
        const full =
          group.rankedVehicles.find((v) => v.vehicleEntryCode === code) ??
          ({
            ...slot.effectiveWinner!,
            isSelectedWinner: true,
            isAutoWinner: false,
            isAlternate: false,
          } as TrophyWinnerListVehicle);
        return [full];
      })
    : group.rankedVehicles;

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4">
      <div>
        <h2 className="text-lg font-semibold">{group.awardName}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{group.sourceHint}</p>
      </div>

      {!winnersOnly && group.placeSlots.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Trophy winners by place
          </p>
          {group.placeSlots.map((slot) => (
            <PlaceWinnerBar
              key={slot.trophyEntryId}
              slot={slot}
              acting={acting === slot.trophyEntryId}
              onExclude={() =>
                patchPlacement({
                  trophyEntryId: slot.trophyEntryId,
                  excludeWinner: true,
                })
              }
            />
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {gridRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {group.rankingSource === "unconfigured"
            ? group.sourceHint
            : "No ranked vehicles yet."}
        </p>
      ) : (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {winnersOnly
              ? "Winners for ceremony"
              : "Ranked vehicles (highest first)"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {gridRows.map((row) => {
              const slot = group.placeSlots.find(
                (s) => s.effectiveWinner?.vehicleEntryCode === row.vehicleEntryCode,
              );
              const showExclude =
                !winnersOnly &&
                row.isSelectedWinner &&
                !!slot &&
                !slot.isVacant;
              return (
                <VehicleGridCard
                  key={row.vehicleEntryCode}
                  row={row}
                  showExclude={showExclude}
                  acting={acting === slot?.trophyEntryId}
                  onExclude={
                    slot
                      ? () =>
                          patchPlacement({
                            trophyEntryId: slot.trophyEntryId,
                            excludeWinner: true,
                          })
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export function AwardTrophyWinnersAdmin({
  eventId,
  initialPayload,
  initialLoadError = null,
}: {
  eventId: string;
  initialPayload?: AwardTrophyWinnersPayload | null;
  initialLoadError?: string | null;
}) {
  const [payload, setPayload] = useState<AwardTrophyWinnersPayload | null>(
    initialPayload ?? null,
  );
  const [loading, setLoading] = useState(!initialPayload && !initialLoadError);
  const [error, setError] = useState<string | null>(initialLoadError);
  const [winnersOnly, setWinnersOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/award-trophy-winners`, {
        credentials: "same-origin",
      });
      const parsed = await readResponseJson<
        AwardTrophyWinnersPayload & { error?: string }
      >(res);
      if (!parsed.bodyIsJson) {
        throw new Error(
          parsed.data?.error ??
            "Could not load trophy winners. Run database migrations if needed.",
        );
      }
      if (!res.ok) {
        throw new Error(parsed.data?.error ?? "Could not load trophy winners.");
      }
      setPayload(parsed.data as AwardTrophyWinnersPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (!initialPayload) {
      void load();
    }
  }, [initialPayload, load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Loading trophy winners…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void load()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!payload) return null;

  if (!payload.judgingFinalized) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <p className="font-medium">Event voting not finalized yet</p>
        <p className="mt-2 text-muted-foreground">
          Finalize results on the Awards &amp; Judging hub first.
        </p>
        <Link
          href={`/organizer/events/${eventId}/awards-judging`}
          className={cn(buttonVariants(), "mt-4 inline-flex")}
        >
          Awards &amp; Judging
        </Link>
      </div>
    );
  }

  if (payload.groups.length === 0) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        <p>No trophies configured for this event.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/20 p-4">
        <div className="flex items-start gap-2">
          <Trophy className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Awards are grouped by category or special award. Vehicles are sorted
            highest to lowest. Use <strong>Manually exclude</strong> on a winner to
            skip them and promote the next alternate for that place.
          </p>
        </div>
        <Button
          type="button"
          variant={winnersOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setWinnersOnly((v) => !v)}
        >
          {winnersOnly ? "Showing winners only" : "Show winners only"}
        </Button>
      </div>

      {payload.groups.map((group) => (
        <AwardGroupCard
          key={group.groupId}
          eventId={eventId}
          group={group}
          winnersOnly={winnersOnly}
          onUpdated={setPayload}
        />
      ))}
    </div>
  );
}
