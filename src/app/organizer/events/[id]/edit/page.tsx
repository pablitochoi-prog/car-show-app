import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { EventForm, type EventInitial } from "@/components/forms/event-form";
import { parseDailyHours } from "@/lib/daily-hours";
import { getEventStaffList, listEventRoleDefinitions } from "@/lib/event-staff";
import { EventStaffManager } from "@/components/forms/event-staff-manager";
import { EventSetupListCards } from "@/components/forms/event-setup-list-cards";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { countEventAwardTrophies } from "@/lib/event-awards-trophies";
import {
  StripeConnectCard,
  type StripeConnectInfo,
} from "@/components/stripe/stripe-connect-card";
import { EventPaymentSettings } from "@/components/stripe/event-payment-settings";
import { getPlatformFee, formatFeeLabel } from "@/lib/platform-fee";
import { formatEventShowNumber } from "@/lib/event-show-number";
import { ContactSiteAdminButton } from "@/components/organizer/contact-site-admin-button";
import { Suspense } from "react";
import { StripeReturnBanner } from "@/components/stripe/stripe-return-banner";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          stripeAccountId: true,
          stripeAccountStatus: true,
          stripeChargesEnabled: true,
          stripePayoutsEnabled: true,
          stripeDetailsSubmitted: true,
        },
      },
    },
  });

  if (!event) notFound();

  const allowed = await canManageEvent(user.id, id, event.orgId, user.platformRole);
  if (!allowed) notFound();

  const [
    memberships,
    staff,
    staffRoleDefinitions,
    tierRows,
    platformFee,
    eventCategoryRows,
    eventAwardRows,
  ] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { userId: user.id },
      select: {
        role: true,
        organization: { select: { id: true, name: true, clubState: true } },
      },
      orderBy: { organization: { name: "asc" } },
    }),
    getEventStaffList(id),
    listEventRoleDefinitions(id),
    event.registrationFeeType === "PAID_TIERED"
      ? prisma.registrationTier.findMany({
          where: { eventId: id },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        })
      : Promise.resolve([]),
    getPlatformFee(),
    prisma.eventCategory.findMany({
      where: { eventId: id },
      select: {
        id: true,
        trophyCount: true,
        customName: true,
        category: { select: { name: true } },
      },
    }),
    prisma.eventAward.findMany({
      where: { eventId: id },
      select: {
        id: true,
        customName: true,
        specialAward: { select: { name: true } },
      },
    }),
  ]);

  const initialCategoryCount = eventCategoryRows.length;
  const initialTrophyCount = countEventAwardTrophies({
    categories: eventCategoryRows.map((row) => ({
      id: row.id,
      name: row.category?.name ?? row.customName ?? "Custom",
      trophyCount: row.trophyCount,
    })),
    specialAwards: eventAwardRows.map((row) => ({
      id: row.id,
      name: row.specialAward?.name ?? row.customName ?? "Award",
    })),
  });

  const convenienceFeeLabel = formatFeeLabel(platformFee);

  const organizerContacts = staff
    .filter((s) => s.roles.some((r) => r.slug === "organizer"))
    .map((s) => ({ name: s.name, email: s.email }));

  const initialTiers = tierRows.map((t) => ({
    id: t.id,
    name: t.name,
    priceCents: t.priceCents,
    opensAt: t.opensAt?.toISOString() ?? null,
    closesAt: t.closesAt?.toISOString() ?? null,
    memberOnly: t.memberOnly,
    sortOrder: t.sortOrder,
  }));

  const organizations = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    clubState: m.organization.clubState ?? null,
  }));

  const listingEditable =
    event.status === "DRAFT" ||
    event.status === "SCHEDULED" ||
    event.status === "PUBLISHED";

  const isOrgOwner = event.orgId
    ? memberships.some(
        (m) => m.organization.id === event.orgId && m.role === "owner",
      )
    : false;

  const stripeInfo: StripeConnectInfo | null = event.organization
    ? {
        orgId: event.organization.id,
        orgName: event.organization.name,
        stripeAccountId: event.organization.stripeAccountId,
        stripeAccountStatus: event.organization.stripeAccountStatus,
        chargesEnabled: event.organization.stripeChargesEnabled,
        payoutsEnabled: event.organization.stripePayoutsEnabled,
        detailsSubmitted: event.organization.stripeDetailsSubmitted,
      }
    : null;

  const initial: EventInitial = {
    id: event.id,
    orgId: event.orgId ?? null,
    name: event.name,
    estimatedCarCount: event.estimatedCarCount ?? null,
    description: event.description,
    venue: event.venue,
    street: event.street,
    city: event.city,
    state: event.state,
    zip: event.zip,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate?.toISOString() ?? null,
    startTime: event.startTime,
    endTime: event.endTime,
    isMultiDay: event.isMultiDay,
    dailyHours: parseDailyHours(event.dailyHours) ?? undefined,
    registrationFeeType: event.registrationFeeType,
    registrationFeeDollars: event.registrationFeeDollars,
    contactName: event.contactName,
    contactFirstName: event.contactFirstName,
    contactLastName: event.contactLastName,
    contactEmail: event.contactEmail,
    contactPhone: event.contactPhone,
    eventWebsite: event.eventWebsite,
    socialHashtag: event.socialHashtag,
    eventType: event.eventType,
    status:
      event.status === "DRAFT"
        ? "DRAFT"
        : event.status === "SCHEDULED"
          ? "SCHEDULED"
          : event.status === "PUBLISHED"
            ? "PUBLISHED"
            : "DRAFT",
    statusReadOnly: !listingEditable,
    listingScheduledAt: event.listingScheduledAt?.toISOString() ?? null,
    lat: event.lat,
    lng: event.lng,
    persistedEventStatus: event.status,
    flyerUrl: event.flyerUrl,
    logoUrl: event.logoUrl,
  };

  return (
    <div className="page-shell max-w-5xl space-y-8">
      <div className="mx-auto max-w-2xl text-center sm:text-left">
        <Link
          href="/dashboard/events"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to my events
        </Link>
        <p className="mt-2 text-sm text-muted-foreground">
            Car show number{" "}
          <span className="font-medium tabular-nums text-foreground">
            {formatEventShowNumber(event.showNumber)}
          </span>
        </p>
        {event.smsVotePrefix ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Vehicle show ID prefix:{" "}
            <span className="font-mono font-medium text-foreground">
              {event.smsVotePrefix}
            </span>
            <span className="hidden sm:inline">
              {" "}
              — each vehicle is {event.smsVotePrefix}-001, {event.smsVotePrefix}
              -005, … (3 letters, no I/O, plus a 3-digit number for SMS)
            </span>
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <Link
            href={`/organizer/events/${event.id}/registrations`}
            className="font-medium text-primary hover:underline"
          >
            Registrations
          </Link>
          <Link
            href={`/organizer/events/${event.id}/messages`}
            className="font-medium text-primary hover:underline"
          >
            Messages
          </Link>
          <ContactSiteAdminButton
            eventId={event.id}
            eventLabel={`${formatEventShowNumber(event.showNumber)} ${event.name}`}
          />
        </div>
      </div>

      {!event.orgId ? (
        <div className="mx-auto max-w-2xl rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          This event is not linked to an organization yet.{" "}
          <Link
            href={`/organizer/events/${event.id}/organization`}
            className="font-medium text-primary underline underline-offset-4"
          >
            Link a club or organization
          </Link>{" "}
          before publishing.
        </div>
      ) : null}

      <EventForm
        key={event.updatedAt.toISOString()}
        initial={initial}
        organizations={organizations}
        eventId={event.id}
        initialTiers={initialTiers}
        eventOrganizerContacts={organizerContacts}
        betweenOrganizerAndActions={
          <>
            <CollapsibleCard title="Payment Settings" defaultOpen={true}>
              {stripeInfo ? (
                <div className="space-y-6">
                  <Suspense fallback={null}>
                    <StripeReturnBanner />
                  </Suspense>
                  <StripeConnectCard
                    info={stripeInfo}
                    canDisconnect={isOrgOwner}
                    returnPath={`/organizer/events/${event.id}/edit`}
                  />
                  <EventPaymentSettings
                    eventId={event.id}
                    stripeReady={stripeInfo.chargesEnabled}
                    paymentEnabled={event.paymentEnabled}
                    convenienceFeeLabel={convenienceFeeLabel}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Link this event to a club or organization to enable payment
                  settings.
                </p>
              )}
            </CollapsibleCard>
            <CollapsibleCard title="Event Staffing" defaultOpen>
              <EventStaffManager
                key={event.id}
                eventId={event.id}
                initialStaff={staff}
                initialRoleDefinitions={staffRoleDefinitions}
              />
            </CollapsibleCard>
            <EventSetupListCards
              eventId={event.id}
              initialCategoryCount={initialCategoryCount}
              initialTrophyCount={initialTrophyCount}
            />
          </>
        }
      />
    </div>
  );
}
