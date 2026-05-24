import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getEventForViewer } from "@/lib/event-access";
import { displayContactName } from "@/lib/contact-display";
import { EventRegistrationPage } from "@/components/registration/event-registration-page";
import { getPlatformFee, getEventSetupFee, type PlatformFeeConfig } from "@/lib/platform-fee";
import { formatEventShowNumber } from "@/lib/event-show-number";
import {
  isStripeCheckoutAvailable,
  isStripeConnectReady,
} from "@/lib/stripe-checkout";
import { getExistingRegistrationForEvent } from "@/lib/registration-for-event";
import {
  formatOrganizerMessageRecipientNote,
  getEventOrganizerDisplayNames,
} from "@/lib/event-staff";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const viewer = await getCurrentUser();
  const event = await getEventForViewer(id, viewer?.id ?? null);
  if (!event) return { title: "Event not found" };
  return {
    title: `${formatEventShowNumber(event.showNumber)} ${event.name} | CarShowApp`,
    description: event.description ?? event.name,
  };
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  const event = await getEventForViewer(id, viewer?.id ?? null);

  if (!event) notFound();

  const [tierRows, existingRegistration, platformFee, eventSetupFee, categoryRows, organizerNames] =
    await Promise.all([
      prisma.registrationTier.findMany({
        where: { eventId: id },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      viewer
        ? getExistingRegistrationForEvent(id, viewer.id)
        : Promise.resolve(null),
      getPlatformFee(),
      getEventSetupFee(),
      prisma.eventCategory.findMany({
        where: { eventId: id },
        include: { category: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      }),
      getEventOrganizerDisplayNames(id),
    ]);

  const organizerMessageNote = formatOrganizerMessageRecipientNote(organizerNames);

  const regVehicleIds = existingRegistration?.vehicleIds ?? [];
  const vehicleRows = viewer
    ? await prisma.vehicle.findMany({
        where: {
          userId: viewer.id,
          OR: [
            { archivedAt: null },
            ...(regVehicleIds.length > 0
              ? [{ id: { in: regVehicleIds } }]
              : []),
          ],
        },
        orderBy: [{ make: "asc" }, { model: "asc" }],
      })
    : [];

  const tiers = tierRows.map((t) => ({
    id: t.id,
    name: t.name,
    priceCents: t.priceCents,
    opensAt: t.opensAt?.toISOString() ?? null,
    closesAt: t.closesAt?.toISOString() ?? null,
    memberOnly: t.memberOnly,
  }));

  const vehicles = vehicleRows.map((v) => ({
    id: v.id,
    year: v.year,
    make: v.make,
    model: v.model,
    trim: v.trim,
    nickname: v.nickname,
    photoUrl: v.photoUrl,
  }));

  const eventCategories = categoryRows.map((ec) => ({
    id: ec.id,
    name: ec.customName ?? ec.category?.name ?? "Uncategorized",
  }));

  const contactName = displayContactName(
    event.contactFirstName,
    event.contactLastName,
    event.contactName,
  );

  const stripeConnectReady = isStripeConnectReady(event);
  const stripeCheckoutAvailable = isStripeCheckoutAvailable(event);

  return (
    <div className="page-shell max-w-6xl">
      <div className="mb-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
        <Link href="/events" className="hover:text-foreground">
          ← All events
        </Link>
        {viewer && (
          <>
            <span aria-hidden>·</span>
            <Link href="/dashboard/events" className="hover:text-foreground">
              My events
            </Link>
          </>
        )}
      </div>

      <EventRegistrationPage
        stripeConnectReady={stripeConnectReady}
        stripeCheckoutAvailable={stripeCheckoutAvailable}
        event={{
          id: event.id,
          name: event.name,
          showNumber: event.showNumber,
          description: event.description,
          status: event.status,
          paymentEnabled: event.paymentEnabled,
          orgName: event.organization?.name ?? null,
          flyerUrl: event.flyerUrl,
          logoUrl: event.logoUrl,
          orgLogoUrl: event.organization?.logo ?? null,
          startDate: event.startDate.toISOString(),
          rainDate: event.rainDate?.toISOString() ?? null,
          startTime: event.startTime,
          endTime: event.endTime,
          registrationFeeType: event.registrationFeeType,
          registrationFeeDollars: event.registrationFeeDollars,
          platformFeeMode: event.platformFeeMode,
          platformSetupFeeCollected: event.platformSetupFeeCollected,
          eventSetupFeeCents: eventSetupFee.amountCents,
          venue: event.venue,
          city: event.city,
          state: event.state,
          lat: event.lat,
          lng: event.lng,
          contactName,
          contactEmail: event.contactEmail,
          contactPhone: event.contactPhone,
          eventWebsite: event.eventWebsite,
          socialHashtag: event.socialHashtag,
          organizerMessageNote,
          sponsorName: event.sponsorName,
          sponsorLogoUrl: event.sponsorLogoUrl,
          sponsorWebsite: event.sponsorWebsite,
          charityName: event.charityName,
          charityDescription: event.charityDescription,
          charityWebsite: event.charityWebsite,
          charityEmail: event.charityEmail,
          charityPhone: event.charityPhone,
          charityLogoUrl: event.charityLogoUrl,
        }}
        tiers={tiers}
        vehicles={vehicles}
        isLoggedIn={!!viewer}
        userContact={
          viewer
            ? {
                firstName: viewer.firstName ?? "",
                lastName: viewer.lastName ?? "",
                email: viewer.email,
                phone: viewer.phone ?? "",
                profileExtras: {
                  birthYear: viewer.birthYear ?? undefined,
                  street: viewer.street ?? "",
                  city: viewer.city ?? "",
                  state: viewer.state ?? "",
                  zip: viewer.zip ?? "",
                },
              }
            : null
        }
        platformFee={platformFee}
        eventCategories={eventCategories}
        existingRegistration={existingRegistration}
      />
    </div>
  );
}
