"use client";

import { useState } from "react";
import { Plus, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddVehicleForm } from "@/components/forms/add-vehicle-form";

export function AddVehicleSection({ autoOpen }: { autoOpen: boolean }) {
  const [open, setOpen] = useState(autoOpen);

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        Add vehicle
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground"
          onClick={() => setOpen(false)}
        >
          <ChevronUp className="size-3.5" />
          Collapse
        </Button>
      </div>
      <AddVehicleForm onSaved={() => setOpen(false)} />
    </div>
  );
}
