"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ScoreSheetVehicleRow = {
  vehicleEntryCode: string;
  registrationId: string;
  registrationVehicleId: string;
  nickname: string | null;
  year: number;
  make: string;
  model: string;
  sheetId: string | null;
  sheetStatus: "DRAFT" | "SUBMITTED" | "FINALIZED" | null;
  finalScore: number | null;
  updatedAt: string | null;
};

type ScoreSheetClassRow = {
  classId: string;
  className: string;
  classDescription: string | null;
  templateName: string;
  totalPoints: number;
  vehicles: ScoreSheetVehicleRow[];
};

export function JudgeScoreSheetClassList({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [classes, setClasses] = useState<ScoreSheetClassRow[]>([]);
  const [eventName, setEventName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function loadAssignments() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/judge/events/${eventId}/score-sheets`, {
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        event?: { name: string };
        classes?: ScoreSheetClassRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load score sheets.");
      setEventName(data.event?.name ?? "");
      setClasses(data.classes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAssignments();
  }, [eventId]);

  async function handleStartOrResume(classId: string, vehicleEntryCode: string) {
    const key = `${classId}:${vehicleEntryCode}`;
    setBusyKey(key);
    try {
      const res = await fetch(`/api/judge/events/${eventId}/score-sheets/start`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, vehicleEntryCode }),
      });
      const data = (await res.json()) as { sheetId?: string; error?: string };
      if (!res.ok || !data.sheetId) {
        throw new Error(data.error ?? "Could not start score sheet.");
      }
      router.push(`/judge/events/${eventId}/score-sheets/${data.sheetId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start score sheet.");
    } finally {
      setBusyKey(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        Loading score sheet assignments…
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

  if (classes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No score sheet judging classes are assigned for this event yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {eventName ? <p className="text-sm text-muted-foreground">{eventName}</p> : null}
      {classes.map((cls) => (
        <Card key={cls.classId}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{cls.className}</CardTitle>
            {cls.classDescription ? (
              <p className="text-xs text-muted-foreground">{cls.classDescription}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {cls.templateName} · {cls.totalPoints} pts
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {cls.vehicles.map((v) => {
              const key = `${cls.classId}:${v.vehicleEntryCode}`;
              const busy = busyKey === key;
              return (
                <Button
                  key={v.vehicleEntryCode}
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-between px-3 py-3 text-left"
                  disabled={busy}
                  onClick={() => void handleStartOrResume(cls.classId, v.vehicleEntryCode)}
                >
                  <span className="min-w-0">
                    <span className="block font-mono text-sm font-semibold">
                      {v.vehicleEntryCode}
                    </span>
                    <span className="block truncate text-sm">
                      {v.nickname ? `${v.nickname} · ` : ""}
                      {v.year} {v.make} {v.model}
                    </span>
                    <span className="block text-xs text-primary">
                      {v.sheetStatus
                        ? `${v.sheetStatus}${v.finalScore != null ? ` · ${v.finalScore.toFixed(1)} pts` : ""}`
                        : "Start score sheet"}
                    </span>
                  </span>
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ChevronRight className="size-5 text-muted-foreground" />
                  )}
                </Button>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
