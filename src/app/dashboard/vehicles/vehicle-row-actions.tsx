"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function VehicleRowActions({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    if (!confirm("Remove this vehicle from your garage?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Could not delete");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Link
        href={`/dashboard/vehicles/${vehicleId}/edit`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        Edit
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive"
        disabled={loading}
        onClick={remove}
      >
        Remove
      </Button>
    </div>
  );
}
