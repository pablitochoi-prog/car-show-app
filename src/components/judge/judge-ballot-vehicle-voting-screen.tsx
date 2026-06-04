"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MAX_BALLOT_CATEGORIES_PER_VEHICLE } from "@/lib/judging/judge-ballot-authorization";
import { readResponseJson } from "@/lib/read-response-json";
import type {
  VehicleBallotCategoryOption,
  VehicleBallotPageData,
} from "@/lib/judging/judge-ballot-vehicle-votes";

type SelectionState = Record<string, { selected: boolean; starRating: number }>;

function StarRow({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex gap-0.5"
      role="group"
      aria-label={`Rating ${value} of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          className="rounded p-0 text-amber-500 disabled:opacity-40"
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          onClick={() => onChange(n)}
        >
          <Star
            className={cn(
              "size-5",
              n <= value ? "fill-current" : "fill-none",
            )}
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}

export function JudgeBallotVehicleVotingScreen({
  eventId,
  vehicleEntryCode,
}: {
  eventId: string;
  vehicleEntryCode: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<VehicleBallotPageData | null>(null);
  const [selections, setSelections] = useState<SelectionState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        `/api/judge/events/${eventId}/ballot/vehicle?code=${encodeURIComponent(vehicleEntryCode)}`,
        { credentials: "same-origin" },
      );
      const parsed = await readResponseJson<
        VehicleBallotPageData & { error?: string }
      >(res);
      if (!parsed.ok || !parsed.data) {
        throw new Error(
          parsed.data?.error ??
            (parsed.rawPreview
              ? `Failed to load ballot (${parsed.status}).`
              : "Failed to load ballot."),
        );
      }
      const json = parsed.data;
      setData(json);
      const initial: SelectionState = {};
      for (const cat of json.categories) {
        const selected =
          cat.existingStatus === "DRAFT" || cat.existingStatus === "SUBMITTED";
        initial[cat.categoryId] = {
          selected,
          starRating: cat.existingStarRating ?? 1,
        };
      }
      setSelections(initial);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [eventId, vehicleEntryCode]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCount = useMemo(
    () => Object.values(selections).filter((s) => s.selected).length,
    [selections],
  );

  function toggleCategory(cat: VehicleBallotCategoryOption) {
    if (!cat.canEdit) return;
    setActionError("");
    setSelections((prev) => {
      const cur = prev[cat.categoryId] ?? { selected: false, starRating: 1 };
      if (!cur.selected && selectedCount >= MAX_BALLOT_CATEGORIES_PER_VEHICLE) {
        setActionError(
          "You can select up to 5 award categories for this vehicle.",
        );
        return prev;
      }
      return {
        ...prev,
        [cat.categoryId]: {
          selected: !cur.selected,
          starRating: cur.starRating || 1,
        },
      };
    });
  }

  async function persist(action: "draft" | "submit") {
    if (!data) return;
    setActionError("");
    setSaving(true);
    const payload = data.categories
      .filter((c) => selections[c.categoryId]?.selected)
      .map((c) => ({
        categoryId: c.categoryId,
        starRating: selections[c.categoryId]?.starRating ?? 1,
      }));

    if (payload.length > MAX_BALLOT_CATEGORIES_PER_VEHICLE) {
      setActionError(
        "You can select up to 5 award categories for this vehicle.",
      );
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/judge/events/${eventId}/ballot/vehicle`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          vehicleEntryCode: data.vehicle.vehicleEntryCode,
          action,
          selections: payload,
        }),
      });
      const parsed = await readResponseJson<{ error?: string; saved?: number }>(
        res,
      );
      if (!parsed.ok || !parsed.data) {
        throw new Error(
          parsed.data?.error ??
            (parsed.rawPreview
              ? `Save failed (${parsed.status}).`
              : "Save failed."),
        );
      }
      if (parsed.data.error) {
        throw new Error(parsed.data.error);
      }
      if (action === "submit") {
        router.push("/judge");
        return;
      }
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
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

  if (error || !data) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error || "Unable to load ballot."}
      </p>
    );
  }

  const v = data.vehicle;

  return (
    <div className="flex min-h-[70vh] flex-col gap-4 pb-28">
      <div>
        <Link
          href="/judge"
          className="text-sm text-muted-foreground underline"
        >
          Back to My Judging
        </Link>
      </div>

      <Card>
        <CardContent className="flex gap-3 pt-4">
          {v.photoUrl ? (
            <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
              <Image
                src={v.photoUrl}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
                unoptimized
              />
            </div>
          ) : (
            <div className="size-20 shrink-0 rounded-md bg-muted" aria-hidden />
          )}
          <div className="min-w-0 text-sm">
            <p className="font-mono font-semibold">{v.vehicleEntryCode}</p>
            <p>
              {v.year} {v.make} {v.model}
              {v.trim ? ` ${v.trim}` : ""}
            </p>
            {v.nickname ? (
              <p className="text-muted-foreground">{v.nickname}</p>
            ) : null}
            {v.ownerLabel ? (
              <p className="text-muted-foreground">Owner: {v.ownerLabel}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">{v.classLabel}</p>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm font-medium">
        {selectedCount} of {MAX_BALLOT_CATEGORIES_PER_VEHICLE} categories
        selected
      </p>

      {actionError ? (
        <p className="text-sm text-destructive">{actionError}</p>
      ) : null}

      <div className="divide-y rounded-lg border">
        {data.categories.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            No open award categories are available for you to vote on this vehicle.
          </p>
        ) : (
          data.categories.map((cat) => {
            const sel = selections[cat.categoryId];
            const checked = sel?.selected ?? false;
            return (
              <div
                key={cat.categoryId}
                className={cn(
                  "px-3 py-2",
                  checked && "bg-primary/5",
                  !cat.canEdit && "opacity-60",
                )}
              >
                <label className="flex cursor-pointer items-center gap-2 leading-tight">
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 rounded border"
                    checked={checked}
                    disabled={!cat.canEdit}
                    onChange={() => toggleCategory(cat)}
                  />
                  <span className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {cat.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {cat.votesRemaining} vote(s) remaining
                    </span>
                  </span>
                </label>
                {checked ? (
                  <div className="mt-1 pl-6">
                    <StarRow
                      value={sel?.starRating ?? 1}
                      disabled={!cat.canEdit}
                      onChange={(starRating) =>
                        setSelections((prev) => ({
                          ...prev,
                          [cat.categoryId]: {
                            selected: true,
                            starRating,
                          },
                        }))
                      }
                    />
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-lg gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={saving || selectedCount === 0}
            onClick={() => void persist("draft")}
          >
            {saving ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            ) : null}
            Save for Later
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={saving || selectedCount === 0}
            onClick={() => void persist("submit")}
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
