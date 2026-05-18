"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";

export type MembershipOption = {
  orgId: string;
  name: string;
  role: string;
};

export function LinkEventOrganizationForm({
  eventId,
  eventName,
  eventShowNumber,
  linkedOrgName,
  memberships,
}: {
  eventId: string;
  eventName: string;
  eventShowNumber: number;
  linkedOrgName: string | null;
  memberships: MembershipOption[];
}) {
  const router = useRouter();
  const [selectedOrgId, setSelectedOrgId] = useState(
    memberships[0]?.orgId ?? ""
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const linked = linkedOrgName != null;

  async function associateOrg(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!selectedOrgId) {
      setError("Choose an organization or create a new one.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: selectedOrgId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not link organization");
        return;
      }
      router.refresh();
      router.push("/dashboard/events");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (linked) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Organization linked</CardTitle>
          <CardDescription>
            <EventNameWithNumber
              name={eventName}
              showNumber={eventShowNumber}
              className="font-medium text-foreground"
            />{" "}
            is associated with{" "}
            <span className="font-medium text-foreground">{linkedOrgName}</span>.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/organizer/events/${eventId}/edit`}
            className={cn(buttonVariants(), "w-full justify-center sm:w-auto")}
          >
            Continue editing event
          </Link>
          <Link
            href="/dashboard/events"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-full justify-center sm:w-auto"
            )}
          >
            Back to my events
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Link a club or organization</CardTitle>
        <CardDescription>
          Choose an organization you already belong to, or create a new club /
          promoter profile and come back here to link it.
        </CardDescription>
      </CardHeader>
      <form onSubmit={associateOrg}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Event:{" "}
            <EventNameWithNumber
              name={eventName}
              showNumber={eventShowNumber}
              className="font-medium text-foreground"
            />
          </p>
          {memberships.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="link-org">Your organizations</Label>
              <select
                id="link-org"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
              >
                {memberships.map((m) => (
                  <option key={m.orgId} value={m.orgId}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              You don&apos;t belong to any organization yet. Create one below —
              you&apos;ll be the owner and can link it automatically.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {memberships.length > 0 ? (
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Associate organization
            </Button>
          ) : null}
          <Link
            href={`/organizer/organizations/new?eventId=${encodeURIComponent(eventId)}`}
            className={cn(
              buttonVariants({
                variant: memberships.length > 0 ? "outline" : "default",
              }),
              "w-full justify-center text-center"
            )}
          >
            Create new organization
          </Link>
          <Link
            href="/dashboard/events"
            className={cn(buttonVariants({ variant: "ghost" }), "w-full")}
          >
            Skip for now
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
