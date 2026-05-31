import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicVehicleSalePage } from "@/components/sale/public-vehicle-sale-page";
import { VehicleEntryHeader } from "@/components/vehicle-entry/vehicle-entry-header";
import { getCurrentUser } from "@/lib/auth";
import { loadPublicVehicleSalePageData } from "@/lib/public-vehicle-sale-listing";
import { userHasActiveSmsNotificationsOptIn } from "@/lib/sms-notifications-consent";

type Props = {
  params: Promise<{ vehicleEntryCode: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vehicleEntryCode } = await params;
  const result = await loadPublicVehicleSalePageData(vehicleEntryCode);
  if (result.kind === "not_found") {
    return { title: "Vehicle not found" };
  }
  const entry = result.kind === "ok" ? result.data.entry : result.entry;
  return {
    title: `${entry.vehicleEntryCode} listing | ${entry.event.name}`,
    description: `Inquire about ${entry.make} ${entry.model} at ${entry.event.name}.`,
  };
}

export default async function VehicleSaleListingPage({ params }: Props) {
  const { vehicleEntryCode } = await params;
  const currentUser = await getCurrentUser();
  const result = await loadPublicVehicleSalePageData(vehicleEntryCode);

  if (result.kind === "not_found") {
    notFound();
  }

  if (result.kind === "unavailable") {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-8">
        <VehicleEntryHeader
          entry={result.entry}
          subtitle="This vehicle is not accepting buyer inquiries right now."
        />
        <p className="text-sm text-muted-foreground">
          The owner may have turned off their listing, or this show may not have
          sale inquiries enabled.
        </p>
        <Link
          href={`/v/${encodeURIComponent(result.entry.vehicleEntryCode)}`}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Back to vehicle page
        </Link>
      </div>
    );
  }

  return (
    <PublicVehicleSalePage
      data={result.data}
      defaultSmsNotificationsOptIn={
        currentUser
          ? userHasActiveSmsNotificationsOptIn(currentUser)
          : false
      }
    />
  );
}
