"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { safeInternalPath } from "@/lib/safe-internal-path";

export function NewOrganizationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const returnTo = safeInternalPath(searchParams.get("returnTo"));

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create organization");
        return;
      }

      if (eventId && data.id) {
        const linkRes = await fetch(`/api/events/${eventId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId: data.id as string }),
        });
        if (!linkRes.ok) {
          const err = await linkRes.json();
          setError(
            err.error ??
              "Organization created but could not link to the event. Link it from the event page."
          );
          router.push(`/organizer/events/${eventId}/organization`);
          router.refresh();
          return;
        }
        router.push(`/organizer/events/${eventId}/organization`);
        router.refresh();
        return;
      }

      if (returnTo) {
        router.push(returnTo);
        router.refresh();
        return;
      }

      router.push("/dashboard/events");
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>New organization</CardTitle>
          <CardDescription>
            {eventId
              ? "This club will be linked to your event after you save."
              : "Your car club, promoter group, or hosting entity. You can attach events to it later."}
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                placeholder="e.g. Riverside Classic Car Club"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
            <Link
              href={
                eventId
                  ? `/organizer/events/${eventId}/organization`
                  : returnTo ?? "/dashboard/events"
              }
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Cancel
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
