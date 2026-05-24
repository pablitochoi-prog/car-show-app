import type { VehicleEntryRecord } from "@/lib/vehicle-entry-types";

function vehicleTitle(entry: VehicleEntryRecord): string {
  const parts = [
    entry.year > 0 ? entry.year : null,
    entry.make,
    entry.model,
    entry.trim?.trim() || null,
  ].filter(Boolean);
  return parts.join(" ");
}

export function VehicleEntryHeader({
  entry,
  subtitle,
}: {
  entry: VehicleEntryRecord;
  subtitle?: string;
}) {
  return (
    <header className="space-y-2 border-b border-border pb-4">
      <p className="text-sm font-medium text-muted-foreground">
        {entry.event.name}
      </p>
      <p className="font-mono text-2xl font-bold tracking-wide text-red-700">
        {entry.vehicleEntryCode}
      </p>
      <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
        {vehicleTitle(entry)}
      </h1>
      {entry.nickname ? (
        <p className="text-base italic text-red-700">
          &ldquo;{entry.nickname}&rdquo;
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">{entry.classLabel}</p>
      {subtitle ? (
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      ) : null}
    </header>
  );
}
