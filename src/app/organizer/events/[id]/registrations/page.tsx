import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { RegistrationFeeType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requireStaffStepUpPage } from "@/lib/require-organizer-step-up";
import { canManageEventRegistrations } from "@/lib/organizer-registrations-auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { formatEventShowNumber } from "@/lib/event-show-number";
import { getPlatformFee } from "@/lib/platform-fee";
import { getEventPlatformFeeStatus } from "@/lib/event-platform-fee-status";
import type { OrganizerRegistrationInput } from "@/lib/organizer-registration-rows";
import { OrganizerRegistrationsClient } from "@/components/organizer/organizer-registrations-client";
import { ContactSiteAdminButton } from "@/components/organizer/contact-site-admin-button";
import { EventOrganizerNav } from "@/components/organizer/event-organizer-nav";

export default async function EventRegistrationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id: eventId } = await params;

  await requireStaffStepUpPage({
    user,
    pathname: `/organizer/events/${eventId}/registrations`,
  });

  const allowed = await canManageEventRegistrations(
    user.id,
    eventId,
    user.platformRole,
  );
  if (!allowed) notFound();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { name: true, showNumber: true },
  });
  if (!event) notFound();

  const [rawRows, platformFee, eventMeta, platformFeeStatus] = await Promise.all([
    prisma.registration.findMany({
      where: { eventId },
      select: {
        id: true,
        userId: true,
        status: true,
        paymentStatus: true,
        amountCents: true,
        platformFeeCents: true,
        refundedCents: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
        tier: { select: { name: true, priceCents: true } },
        vehicles: { select: { id: true } },
        guestFirstName: true,
        guestLastName: true,
        guestEmail: true,
        guestPhone: true,
        registrantFirstName: true,
        registrantLastName: true,
        registrantEmail: true,
        registrantPhone: true,
        guestVehicles: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    getPlatformFee(),
    prisma.event.findUnique({
      where: { id: eventId },
      select: {
        registrationFeeType: true,
        registrationFeeDollars: true,
      },
    }),
    getEventPlatformFeeStatus(eventId),
  ]);

  if (!eventMeta) notFound();

  const registrationInputs: OrganizerRegistrationInput[] = rawRows.map(
    (r) => ({
      id: r.id,
      userId: r.userId,
      status: r.status,
      paymentStatus: r.paymentStatus,
      amountCents: r.amountCents,
      platformFeeCents: r.platformFeeCents,
      refundedCents: r.refundedCents,
      createdAt: r.createdAt.toISOString(),
      tierName: r.tier.name,
      tierPriceCents: r.tier.priceCents,
      vehicles: r.vehicles,
      guestVehicles: r.guestVehicles,
      user: r.user,
      guestFirstName: r.guestFirstName,
      guestLastName: r.guestLastName,
      guestEmail: r.guestEmail,
      guestPhone: r.guestPhone,
      registrantFirstName: r.registrantFirstName,
      registrantLastName: r.registrantLastName,
      registrantEmail: r.registrantEmail,
      registrantPhone: r.registrantPhone,
    }),
  );

  const registrationFeeType =
    (eventMeta.registrationFeeType ?? "FREE") as RegistrationFeeType;

  const eventLabel = `${formatEventShowNumber(event.showNumber)} ${event.name}`;

  return (
    <div className="page-shell max-w-6xl space-y-6">
      <div className="text-center sm:text-left">
        <Link
          href="/dashboard/events?tab=managing"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← My events
        </Link>
      </div>

      <div className="space-y-4">
        <EventOrganizerNav eventId={eventId} active="registrations" />
      </div>

      <div className="page-head flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Registrations —{" "}
            <EventNameWithNumber
              name={event.name}
              showNumber={event.showNumber}
            />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {registrationInputs.length} registrant
            {registrationInputs.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <ContactSiteAdminButton
            eventId={eventId}
            eventLabel={eventLabel}
            className="w-full justify-center sm:w-auto"
          />
          <a
            href={`/api/events/${eventId}/registrations/export`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "inline-flex w-full justify-center sm:w-auto",
            )}
          >
            Download CSV
          </a>
        </div>
      </div>

      <OrganizerRegistrationsClient
        eventId={eventId}
        eventLabel={eventLabel}
        registrationInputs={registrationInputs}
        registrationFeeType={registrationFeeType}
        suggestedDonationDollars={eventMeta.registrationFeeDollars}
        platformFee={platformFee}
        isDonationEvent={registrationFeeType === "DONATION"}
        dashCardsAllowed={platformFeeStatus?.paid ?? true}
        dashCardsBlockedMessage={platformFeeStatus?.dashCardsBlockedMessage}
      />
    </div>
  );
}
