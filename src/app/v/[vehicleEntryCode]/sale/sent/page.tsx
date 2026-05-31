import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findVehicleEntryByCode } from "@/lib/vehicle-entry-lookup";

type Props = {
  params: Promise<{ vehicleEntryCode: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vehicleEntryCode } = await params;
  const entry = await findVehicleEntryByCode(vehicleEntryCode);
  if (!entry) return { title: "Vehicle not found" };
  return {
    title: `Inquiry sent | ${entry.vehicleEntryCode}`,
  };
}

export default async function VehicleSaleInquirySentPage({ params }: Props) {
  const { vehicleEntryCode } = await params;
  const entry = await findVehicleEntryByCode(vehicleEntryCode);
  if (!entry) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-8 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Inquiry sent</h1>
      <p className="text-sm text-muted-foreground">
        Thank you. Your message about{" "}
        <span className="font-mono font-semibold text-foreground">
          {entry.vehicleEntryCode}
        </span>{" "}
        has been forwarded to the vehicle owner. They may contact you directly
        using the email or phone you provided.
      </p>
      <p className="text-xs text-muted-foreground">
        CarShowScout is not a party to any sale and does not guarantee a
        response.
      </p>
      <Link
        href={`/v/${encodeURIComponent(entry.vehicleEntryCode)}/sale`}
        className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Back to listing
      </Link>
    </div>
  );
}
