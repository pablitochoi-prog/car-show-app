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
import { resolveRegistrationContact } from "@/lib/registration-contact";

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

  const registration = await getRegistrationByIdForOrganizer(
    eventId,
    registrationId,
  );
  if (!registration) notFound();

  if (!registration.userId) {
    const guestRow = await prisma.registration.findFirst({
      where: { id: registrationId, eventId },
      select: {
        guestFirstName: true,
        guestLastName: true,
        guestEmail: true,
        guestPhone: true,
        registrantFirstName: true,
        registrantLastName: true,
        registrantEmail: true,
        registrantPhone: true,
        user: { select: { name: true, email: true, phone: true, firstName: true, lastName: true, status: true } },
      },
    });
    const contact = guestRow
      ? resolveRegistrationContact(guestRow)
      : { name: "Guest", email: "", phone: "" };

    return (
      <div className="page-shell max-w-2xl space-y-6">
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
            {contact.name} · {contact.email}
          </p>
          <p className="mt-4 text-sm">
            Guest registrations cannot be edited in the full registration form
            yet. Use bulk actions on the registrations list to cancel or refund.
          </p>
        </div>
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
