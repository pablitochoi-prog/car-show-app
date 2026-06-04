"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function VehicleRegistrationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[vehicle-registrations]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-12">
      <h1 className="text-lg font-semibold">Vehicle registrations could not load</h1>
      <p className="text-sm text-muted-foreground">
        {error.message || "Something went wrong while loading this page."}
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Link href="/dashboard/events?tab=managing" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to my events
        </Link>
      </div>
    </div>
  );
}
