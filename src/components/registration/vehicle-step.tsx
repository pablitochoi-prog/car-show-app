"use client";

import { cn } from "@/lib/utils";
import { normalizeVinInput } from "@/lib/vehicle-vin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car, Plus, X, Check } from "lucide-react";

export type VehicleOption = {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
};

export type NewVehicleRow = {
  year: string;
  make: string;
  model: string;
  trim: string;
  vin: string;
  notes: string;
};

export function VehicleStep({
  vehicles,
  selected,
  onToggle,
  newRows,
  onNewRowsChange,
}: {
  vehicles: VehicleOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  newRows: NewVehicleRow[];
  onNewRowsChange: (rows: NewVehicleRow[]) => void;
}) {
  function addBlankRow() {
    onNewRowsChange([...newRows, { year: "", make: "", model: "", trim: "", vin: "", notes: "" }]);
  }

  function updateRow(i: number, patch: Partial<NewVehicleRow>) {
    onNewRowsChange(newRows.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  function removeRow(i: number) {
    onNewRowsChange(newRows.filter((_, j) => j !== i));
  }

  const totalSelected = selected.size + newRows.filter((r) => r.make && r.model && r.year).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Choose your vehicles</h2>
        <p className="text-sm text-muted-foreground">
          Select from your garage or add a new vehicle.
          {totalSelected > 0 && (
            <span className="ml-1 font-medium text-primary">
              {totalSelected} selected
            </span>
          )}
        </p>
      </div>

      {vehicles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Your Garage
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {vehicles.map((v) => {
              const active = selected.has(v.id);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onToggle(v.id)}
                  className={cn(
                    "relative flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-accent/30",
                  )}
                >
                  <div className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                  )}>
                    {active && <Check className="size-3" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Car className="mb-1 size-4 text-muted-foreground" />
                    <p className="font-semibold leading-snug">
                      {v.year} {v.make} {v.model}
                    </p>
                    {v.trim && (
                      <p className="text-sm text-muted-foreground">{v.trim}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {vehicles.length === 0 && newRows.length === 0 && (
        <div className="rounded-xl border-2 border-dashed p-8 text-center">
          <Car className="mx-auto mb-3 size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No saved vehicles yet. Add your vehicle details below.
          </p>
        </div>
      )}

      {/* Add new vehicle section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Add New Vehicle
          </h3>
        </div>

        {newRows.map((row, i) => (
          <div
            key={i}
            className="relative rounded-xl border bg-card p-4 shadow-sm"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 size-7 text-muted-foreground hover:text-destructive"
              onClick={() => removeRow(i)}
              aria-label="Remove vehicle"
            >
              <X className="size-4" />
            </Button>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Year *</Label>
                <Input
                  type="number"
                  placeholder="e.g. 1969"
                  value={row.year}
                  onChange={(e) => updateRow(i, { year: e.target.value })}
                  className="h-9"
                  min={1885}
                  max={new Date().getFullYear() + 2}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Make *</Label>
                <Input
                  placeholder="e.g. Chevrolet"
                  value={row.make}
                  onChange={(e) => updateRow(i, { make: e.target.value })}
                  className="h-9"
                  maxLength={100}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Model *</Label>
                <Input
                  placeholder="e.g. Camaro"
                  value={row.model}
                  onChange={(e) => updateRow(i, { model: e.target.value })}
                  className="h-9"
                  maxLength={100}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Trim (optional)</Label>
                <Input
                  placeholder="e.g. SS 396"
                  value={row.trim}
                  onChange={(e) => updateRow(i, { trim: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">VIN (optional)</Label>
                <Input
                  placeholder="e.g. 1HGBH41JXMN109186"
                  value={row.vin}
                  onChange={(e) =>
                    updateRow(i, { vin: normalizeVinInput(e.target.value) })
                  }
                  maxLength={17}
                  className="h-9 font-mono uppercase tabular-nums tracking-wide"
                  spellCheck={false}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Your Vehicle Story (optional)</Label>
                <Input
                  placeholder="Any details about your vehicle"
                  value={row.notes}
                  onChange={(e) => updateRow(i, { notes: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={addBlankRow}
        >
          <Plus className="size-4" />
          Add a vehicle
        </Button>
      </div>
    </div>
  );
}
