"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeVehicleEntryCode } from "@/lib/vehicle-entry-code";

export function JudgeBallotQuickVote({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [vehicleId, setVehicleId] = useState("");
  const [error, setError] = useState("");

  function goVote() {
    const code = normalizeVehicleEntryCode(vehicleId);
    if (!code) {
      setError("Enter a valid vehicle ID.");
      return;
    }
    setError("");
    router.push(
      `/judge/events/${eventId}/ballot/vote?code=${encodeURIComponent(code)}`,
    );
  }

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <p className="text-sm font-semibold">Judge Ballot</p>
      <div className="space-y-1">
        <Label htmlFor={`vehicle-id-${eventId}`} className="text-xs">
          Enter Vehicle ID
        </Label>
        <Input
          id={`vehicle-id-${eventId}`}
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          placeholder="e.g. AXY-004"
          className="h-9"
          autoCapitalize="characters"
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button type="button" size="sm" className="w-full" onClick={goVote}>
        Vote
      </Button>
    </div>
  );
}
