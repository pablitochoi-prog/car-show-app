"use client";

import { useEffect, useState } from "react";
import { Car, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EditVehicleForm,
  type EditVehicleSaved,
} from "@/components/forms/edit-vehicle-form";
import {
  VehiclePhotoDisplay,
  resolveVehiclePhotoSrc,
} from "@/components/vehicle/vehicle-photo-display";
import { formatVinMaskLastFour } from "@/lib/vehicle-vin";
import type { VehicleOption } from "@/components/registration/event-registration-page";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: VehicleOption;
  photoSrc: string | null;
  onAddToRegistration: () => void;
  onVehicleUpdated: (vehicle: VehicleOption) => void;
};

export function GarageVehicleActionDialog({
  open,
  onOpenChange,
  vehicle,
  photoSrc,
  onAddToRegistration,
  onVehicleUpdated,
}: Props) {
  const [mode, setMode] = useState<"choose" | "edit">("choose");

  useEffect(() => {
    if (open) setMode("choose");
  }, [open, vehicle.id]);

  if (!open) return null;

  function handleClose() {
    onOpenChange(false);
  }

  function handleSaved(saved: EditVehicleSaved) {
    onVehicleUpdated({
      id: saved.id,
      year: saved.year,
      make: saved.make,
      model: saved.model,
      trim: saved.trim,
      nickname: saved.nickname,
      vin: saved.vin,
      photoUrl: saved.photoUrl,
      notes: saved.notes,
    });
    onOpenChange(false);
  }

  const vinMask = formatVinMaskLastFour(vehicle.vin);
  const resolvedPhoto = resolveVehiclePhotoSrc(photoSrc);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close dialog"
        onClick={handleClose}
      />
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border bg-background shadow-lg">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b px-6 py-4">
          <div className="min-w-0 pr-6">
            <h2 className="text-lg font-semibold">
              {mode === "edit" ? "Edit vehicle" : "My Garage vehicle"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {vehicle.year} {vehicle.make} {vehicle.model}
              {vehicle.trim ? ` ${vehicle.trim}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
            onClick={handleClose}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          {mode === "choose" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                {resolvedPhoto ? (
                  <VehiclePhotoDisplay
                    src={resolvedPhoto}
                    alt=""
                    size="thumb"
                    className="shrink-0"
                  />
                ) : (
                  <div className="vehicle-photo-frame vehicle-photo-frame--thumb flex shrink-0 items-center justify-center rounded-md border border-dashed bg-muted/40">
                    <Car className="size-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </p>
                  {vehicle.nickname?.trim() ? (
                    <p className="text-sm text-muted-foreground">
                      {vehicle.nickname.trim()}
                    </p>
                  ) : null}
                  {vinMask ? (
                    <p className="font-mono text-xs text-muted-foreground">
                      {vinMask}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  className="gap-1.5 sm:flex-1"
                  onClick={() => {
                    onAddToRegistration();
                    onOpenChange(false);
                  }}
                >
                  <Plus className="size-4" />
                  Add to registration
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5 sm:flex-1"
                  onClick={() => setMode("edit")}
                >
                  <Pencil className="size-4" />
                  Edit vehicle details
                </Button>
              </div>
            </div>
          ) : (
            <EditVehicleForm
              embedded
              vehicleId={vehicle.id}
              initial={{
                year: vehicle.year,
                make: vehicle.make,
                model: vehicle.model,
                trim: vehicle.trim,
                nickname: vehicle.nickname,
                vin: vehicle.vin,
                notes: vehicle.notes,
                photoUrl: vehicle.photoUrl,
              }}
              onCancel={() => setMode("choose")}
              onSaved={handleSaved}
            />
          )}
        </div>
      </div>
    </div>
  );
}
