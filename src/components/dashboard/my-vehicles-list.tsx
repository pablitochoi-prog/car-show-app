"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Loader2, Pencil, Trash2 } from "lucide-react";
import { VehiclePhotoDisplay } from "@/components/vehicle/vehicle-photo-display";
import {
  EditVehicleForm,
  type EditVehicleInitial,
} from "@/components/forms/edit-vehicle-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GarageVehicleListItem } from "@/lib/garage-vehicle";

function EditVehicleDialog({
  vehicle,
  open,
  onClose,
}: {
  vehicle: GarageVehicleListItem;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  const initial: EditVehicleInitial = {
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim,
    nickname: vehicle.nickname,
    vin: vehicle.vin,
    notes: vehicle.notes,
    photoUrl: vehicle.photoUrl,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-background p-4 shadow-lg">
        <EditVehicleForm
          vehicleId={vehicle.id}
          initial={initial}
          embedded
          onSaved={() => onClose()}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

function VehicleRow({
  vehicle,
  onEdit,
  onRemoved,
}: {
  vehicle: GarageVehicleListItem;
  onEdit: () => void;
  onRemoved: () => void;
}) {
  const [removing, setRemoving] = useState(false);

  async function remove() {
    if (!confirm("Remove this vehicle from your garage?")) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        alert(data.error ?? "Could not delete");
        return;
      }
      onRemoved();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <li className="flex items-start justify-between gap-2 px-3 py-3 text-sm">
      <span className="flex min-w-0 items-start gap-3">
        {vehicle.photoUrl ? (
          <VehiclePhotoDisplay
            src={vehicle.photoUrl}
            alt=""
            size="thumb"
            className="w-20"
          />
        ) : null}
        <span className="min-w-0">
          <span className="font-medium">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </span>
          {vehicle.trim ? ` ${vehicle.trim}` : ""}
          {vehicle.nickname ? (
            <span className="block text-xs italic text-muted-foreground">
              &quot;{vehicle.nickname}&quot;
            </span>
          ) : null}
          {vehicle.notes ? (
            <span className="block text-muted-foreground line-clamp-1">
              {vehicle.notes}
            </span>
          ) : null}
        </span>
      </span>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <Link
          href={`/dashboard/vehicles/${vehicle.id}`}
          className={cn(buttonVariants({ variant: "default", size: "sm" }))}
        >
          <Eye className="size-3.5" aria-hidden />
          View
        </Link>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" aria-hidden />
          Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={removing}
          onClick={() => void remove()}
        >
          {removing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
          <span className="sr-only">Remove</span>
        </Button>
      </div>
    </li>
  );
}

export function MyVehiclesList({
  vehicles: initialVehicles,
}: {
  vehicles: GarageVehicleListItem[];
}) {
  const router = useRouter();
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [editing, setEditing] = useState<GarageVehicleListItem | null>(null);

  function refresh() {
    router.refresh();
  }

  if (vehicles.length === 0) {
    return null;
  }

  return (
    <>
      <ul className="divide-y rounded-md border">
        {vehicles.map((v) => (
          <VehicleRow
            key={v.id}
            vehicle={v}
            onEdit={() => setEditing(v)}
            onRemoved={() => {
              setVehicles((prev) => prev.filter((row) => row.id !== v.id));
              refresh();
            }}
          />
        ))}
      </ul>

      {editing ? (
        <EditVehicleDialog
          vehicle={editing}
          open
          onClose={() => {
            setEditing(null);
            refresh();
          }}
        />
      ) : null}
    </>
  );
}
