import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEventAndLoad } from "@/lib/auth";
import { displayContactName } from "@/lib/contact-display";
import { EventRegistrationPage } from "@/components/registration/event-registration-page";
import { getPlatformFee } from "@/lib/platform-fee";
import { getRegistrationByIdForOrganizer } from "@/lib/registration-for-event";
import {
  isStripeCheckoutAvailable,
  isStripeConnectReady,
} from "@/lib/stripe-checkout";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { formatMoney } from "@/components/registration/reg-utils";
import { buildOrganizerRegistrationRow } from "@/lib/organizer-registration-rows";
import {
  OrganizerGuestRegistrationDetail,
  type OrganizerGuestVehicleRow,
} from "@/components/organizer/organizer-guest-registration-detail";
import type { GuestVehicleRecord } from "@/lib/event-sms-vehicle-id";
import { syncAllRegistrationStaffPhotos } from "@/lib/event-registration-staff-photos";

function parseGuestVehicles(raw: unknown): GuestVehicleRecord[] {
  if (Array.isArray(raw)) {
    return raw.filter(
      (item): item is GuestVehicleRecord =>
        item != null && typeof item === "object",
    );
  }
  return [];
}

function guestVehiclePhotoUrl(
  eventId: string,
  registrationId: string,
  vehicle: GuestVehicleRecord,
): string | null {
  const publicUrl = vehicle.photoUrl?.trim();
  if (publicUrl?.startsWith("http")) return publicUrl;

  const pid = vehicle.publicVehicleId?.trim();
  if (!pid) return null;

  return `/api/events/${eventId}/registrations/${registrationId}/staff-photos/guest-vehicle/${encodeURIComponent(pid)}/view`;
}

export default async function OrganizerRegistrationEditPage({
  params,
}: {
  params: Promise<{ id: string; registrationId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id: eventId, registrationId } = await params;

  const { allowed } = await canManageEventAndLoad(
    user.id,
    eventId,
    user.platformRole,
  );
  if (!allowed) notFound();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      organization: {
        select: {
          name: true,
          stripeAccountId: true,
          stripeChargesEnabled: true,
          stripePayoutsEnabled: true,
          stripeDetailsSubmitted: true,
        },
      },
    },
  });
  if (!event) notFound();

  const registrationFeeType = event.registrationFeeType ?? "FREE";

  const registration = await getRegistrationByIdForOrganizer(
    eventId,
    registrationId,
  );
  if (!registration) notFound();

  if (!registration.userId) {
    try {
      await syncAllRegistrationStaffPhotos(registrationId);
    } catch (e) {
      console.error("guest registration staff photo sync:", e);
    }

    const [guestRow, categoryRows, platformFee] = await Promise.all([
      prisma.registration.findFirst({
        where: { id: registrationId, eventId },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          amountCents: true,
          platformFeeCents: true,
          refundedCents: true,
          createdAt: true,
          updatedAt: true,
          paidAt: true,
          stripeCheckoutSessionId: true,
          stripePaymentIntentId: true,
          guestVehicles: true,
          guestFirstName: true,
          guestLastName: true,
          guestEmail: true,
          guestPhone: true,
          guestStreet: true,
          guestCity: true,
          guestState: true,
          guestZip: true,
          tier: { select: { name: true, priceCents: true } },
          vehicles: { select: { id: true } },
        },
      }),
      prisma.eventCategory.findMany({
        where: { eventId },
        include: { category: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      }),
      getPlatformFee(),
    ]);

    if (!guestRow) notFound();

    const categoryNameById = Object.fromEntries(
      categoryRows.map((c) => [
        c.id,
        c.customName ?? c.category?.name ?? "Uncategorized",
      ]),
    );

    const organizerRow = buildOrganizerRegistrationRow(
      {
        id: guestRow.id,
        userId: null,
        status: guestRow.status,
        paymentStatus: guestRow.paymentStatus,
        amountCents: guestRow.amountCents,
        platformFeeCents: guestRow.platformFeeCents,
        refundedCents: guestRow.refundedCents,
        createdAt: guestRow.createdAt.toISOString(),
        tierName: guestRow.tier.name,
        tierPriceCents: guestRow.tier.priceCents,
        vehicles: guestRow.vehicles,
        guestVehicles: guestRow.guestVehicles,
        user: null,
        guestFirstName: guestRow.guestFirstName,
        guestLastName: guestRow.guestLastName,
        guestEmail: guestRow.guestEmail,
        guestPhone: guestRow.guestPhone,
        registrantFirstName: null,
        registrantLastName: null,
        registrantEmail: null,
        registrantPhone: null,
      },
      {
        registrationFeeType,
        suggestedDonationPerVehicleDollars: event.registrationFeeDollars,
      },
      platformFee,
    );

    const vehicles: OrganizerGuestVehicleRow[] = parseGuestVehicles(
      guestRow.guestVehicles,
    ).map((v) => ({
      publicVehicleId: v.publicVehicleId?.trim() ?? null,
      year: v.year,
      make: v.make,
      model: v.model,
      trim: v.trim?.trim() ?? null,
      nickname: v.nickname?.trim() ?? null,
      notes: v.notes?.trim() ?? null,
      eventCategoryId: v.eventCategoryId ?? null,
      className: v.eventCategoryId
        ? (categoryNameById[v.eventCategoryId] ?? null)
        : null,
      photoUrl: guestVehiclePhotoUrl(eventId, registrationId, v),
    }));

    const eventCategories = categoryRows.map((ec) => ({
      id: ec.id,
      name: ec.customName ?? ec.category?.name ?? "Uncategorized",
    }));

    const stripeConnectReady = isStripeConnectReady(event);

    return (
      <div className="page-shell max-w-6xl space-y-6">
        <Link
          href={`/organizer/events/${eventId}/registrations`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Registrations
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            Guest registration —{" "}
            <EventNameWithNumber
              name={event.name}
              showNumber={event.showNumber}
            />
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {registration.contact.firstName} {registration.contact.lastName} ·{" "}
            {registration.contact.email}
          </p>
        </div>

        <OrganizerGuestRegistrationDetail
          data={{
            registrationId: guestRow.id,
            eventId,
            createdAt: guestRow.createdAt.toISOString(),
            updatedAt: guestRow.updatedAt.toISOString(),
            paidAt: guestRow.paidAt?.toISOString() ?? null,
            contact: registration.contact,
            tierName: guestRow.tier.name,
            tierPriceDisplay:
              guestRow.tier.priceCents === 0
                ? "Free"
                : formatMoney(guestRow.tier.priceCents),
            displayStatus: organizerRow.displayStatus,
            registrationStatus: guestRow.status,
            paymentStatus: guestRow.paymentStatus,
            regFeeDisplay: organizerRow.regFeeDisplay,
            amountCollectedDisplay: organizerRow.amountCollectedDisplay,
            amountDueDisplay: organizerRow.amountDueDisplay,
            vehicleCount: organizerRow.vehicleCount,
            stripeCheckoutSessionId: guestRow.stripeCheckoutSessionId,
            stripePaymentIntentId: guestRow.stripePaymentIntentId,
            stripeConnectReady,
            canEdit: guestRow.status !== "CANCELLED",
            eventCategories,
            vehicles,
          }}
        />
      </div>
    );
  }

  const [tierRows, platformFee, categoryRows, registrant] = await Promise.all([
    prisma.registrationTier.findMany({
      where: { eventId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    getPlatformFee(),
    prisma.eventCategory.findMany({
      where: { eventId },
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: registration.userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        birthYear: true,
        street: true,
        city: true,
        state: true,
        zip: true,
      },
    }),
  ]);

  if (!registrant) notFound();

  const regVehicleIds = registration.vehicleIds;
  const vehicleRows = await prisma.vehicle.findMany({
    where: {
      userId: registration.userId,
      OR: [
        { archivedAt: null },
        ...(regVehicleIds.length > 0 ? [{ id: { in: regVehicleIds } }] : []),
      ],
    },
    orderBy: [{ make: "asc" }, { model: "asc" }],
  });

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

  const existingRegistration = {
    id: registration.id,
    tierId: registration.tierId,
    vehicleIds: registration.vehicleIds,
    vehicleCategories: registration.vehicleCategories,
    vehiclePublicIds: registration.vehiclePublicIds,
    contact: registration.contact,
    paymentStatus: registration.paymentStatus,
    registrationStatus: registration.registrationStatus,
    amountCents: registration.amountCents,
    platformFeeCents: registration.platformFeeCents,
    refundedCents: registration.refundedCents,
  };

  return (
    <div className="page-shell max-w-6xl space-y-4">
      <div className="text-sm text-muted-foreground">
        <Link
          href={`/organizer/events/${eventId}/registrations`}
          className="hover:text-foreground"
        >
          ← Registrations
        </Link>
        <span className="mx-2" aria-hidden>
          ·
        </span>
        <span className="text-foreground">
          Update registration for {registration.contact.firstName}{" "}
          {registration.contact.lastName}
        </span>
      </div>

      <EventRegistrationPage
        stripeConnectReady={stripeConnectReady}
        stripeCheckoutAvailable={stripeCheckoutAvailable}
        organizerEditMode
        registerApiPath={`/api/events/${eventId}/registrations/${registrationId}`}
        registerMethod="PATCH"
        afterSaveRedirectHref={`/organizer/events/${eventId}/registrations?updated=1`}
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
          startDate: event.startDate.toISOString(),
          startTime: event.startTime,
          endTime: event.endTime,
          registrationFeeType: event.registrationFeeType,
          registrationFeeDollars: event.registrationFeeDollars,
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
        }}
        tiers={tiers}
        vehicles={vehicles}
        isLoggedIn
        userContact={{
          firstName: registrant.firstName ?? "",
          lastName: registrant.lastName ?? "",
          email: registrant.email,
          phone: registrant.phone ?? "",
          street: registrant.street ?? "",
          city: registrant.city ?? "",
          state: registrant.state ?? "",
          zip: registrant.zip ?? "",
          profileExtras: {
            birthYear: registrant.birthYear ?? undefined,
            street: registrant.street ?? "",
            city: registrant.city ?? "",
            state: registrant.state ?? "",
            zip: registrant.zip ?? "",
          },
        }}
        platformFee={platformFee}
        eventCategories={eventCategories}
        existingRegistration={existingRegistration}
      />
    </div>
  );
}