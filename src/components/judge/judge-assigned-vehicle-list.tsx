"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AssignedVehicle = {
  registrationVehicleId: string;
  vehicleEntryCode: string;
  sheetId: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  nickname: string | null;
  photoUrl: string | null;
  ownerName: string | null;
  vehicleClass: string;
  judgingClassName: string;
  assignmentStatus: "NOT_JUDGED" | "SAVED_FOR_LATER" | "SUBMITTED";
  assignedCategories: Array<{ sectionName: string; status: string }>;
  sheetStatus: string;
  finalScore: number | null;
};

const STATUS_LABEL: Record<AssignedVehicle["assignmentStatus"], string> = {
  NOT_JUDGED: "Not judged",
  SAVED_FOR_LATER: "Saved for later",
  SUBMITTED: "Submitted",
};

const STATUS_VARIANT: Record<
  AssignedVehicle["assignmentStatus"],
  "default" | "secondary" | "outline"
> = {
  NOT_JUDGED: "default",
  SAVED_FOR_LATER: "secondary",
  SUBMITTED: "outline",
};

export function JudgeAssignedVehicleList({ eventId }: { eventId: string }) {
  const [vehicles, setVehicles] = useState<AssignedVehicle[]>([]);
  const [eventName, setEventName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/judge/events/${eventId}/score-sheets`, {
          credentials: "same-origin",
        });
        const data = (await res.json()) as {
          event?: { name: string };
          vehicles?: AssignedVehicle[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Failed to load assignments.");
        setEventName(data.event?.name ?? "");
        setVehicles(data.vehicles ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load.");
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  const grouped = useMemo(() => {
    const order: AssignedVehicle["assignmentStatus"][] = [
      "NOT_JUDGED",
      "SAVED_FOR_LATER",
      "SUBMITTED",
    ];
    return order.map((status) => ({
      status,
      label: STATUS_LABEL[status],
      vehicles: vehicles.filter((v) => v.assignmentStatus === status),
    }));
  }, [vehicles]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Loading assigned vehicles…
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    );
  }

  if (vehicles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No scorecard category assignments yet. Ask the organizer to assign you to
        vehicles and categories.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {eventName ? <p className="text-sm text-muted-foreground">{eventName}</p> : null}
      {grouped.map(
        (group) =>
          group.vehicles.length > 0 && (
            <section key={group.status} className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </h2>
              <ul className="space-y-2">
                {group.vehicles.map((v) => (
                  <li key={v.registrationVehicleId}>
                    <Link
                      href={`/judge/events/${eventId}/score-sheets/${v.sheetId}`}
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "flex h-auto w-full justify-between gap-3 px-3 py-3 text-left",
                      )}
                    >
                        <span className="flex min-w-0 flex-1 gap-3">
                          {v.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={v.photoUrl}
                              alt=""
                              className="size-14 shrink-0 rounded-md object-cover"
                            />
                          ) : (
                            <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                              No photo
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm font-semibold">
                                {v.vehicleEntryCode}
                              </span>
                              <Badge variant={STATUS_VARIANT[v.assignmentStatus]}>
                                {STATUS_LABEL[v.assignmentStatus]}
                              </Badge>
                            </span>
                            <span className="mt-0.5 block truncate text-sm">
                              {v.nickname ? `${v.nickname} · ` : ""}
                              {v.year} {v.make} {v.model}
                              {v.trim ? ` ${v.trim}` : ""}
                            </span>
                            {v.ownerName ? (
                              <span className="block text-xs text-muted-foreground">
                                {v.ownerName}
                              </span>
                            ) : null}
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {v.vehicleClass} · {v.judgingClassName}
                            </span>
                            <span className="mt-1 block text-xs text-primary">
                              {v.assignedCategories.map((c) => c.sectionName).join(", ")}
                            </span>
                          </span>
                        </span>
                        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ),
      )}
    </div>
  );
}
