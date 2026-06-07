import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { canManageVehicleRegistrations } from "@/lib/vehicle-registrations-auth";
import { requireStaffStepUpPage } from "@/lib/require-organizer-step-up";
import { EventForm, type EventInitial } from "@/components/forms/event-form";
import { parseDailyHours } from "@/lib/daily-hours";
import { getEventStaffList, listEventRoleDefinitions } from "@/lib/event-staff";
import { EventStaffManager } from "@/components/forms/event-staff-manager";
import { EventSetupListCards } from "@/components/forms/event-setup-list-cards";
import { ContextualHelpLink } from "@/components/help/contextual-help-link";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { EventOrganizerNavBar } from "@/components/organizer/event-organizer-nav-bar";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { countEventAwardTrophies } from "@/lib/event-awards-trophies";
import {
  StripeConnectCard,
  type StripeConnectInfo,
} from "@/components/stripe/stripe-connect-card";
import { EventPaymentSettings } from "@/components/stripe/event-payment-settings";
import { getPlatformFee, formatFeeLabel, getEventSetupFee, formatEventSetupFeeLabel } from "@/lib/platform-fee";
import { getEventPlatformFeeStatus } from "@/lib/event-platform-fee-status";
import { CompletedBadge } from "@/components/ui/completed-badge";
import { formatEventShowNumber } from "@/lib/event-show-number";
import { ContactSiteAdminButton } from "@/components/organizer/contact-site-admin-button";
import { EventMessagesButton } from "@/components/organizer/event-messages-button";
import { countUnreadMessagesForUserAndEvent } from "@/lib/unread-messages";
import { Suspense } from "react";
import { StripeReturnBanner } from "@/components/stripe/stripe-return-banner";
import { fulfillPlatformSetupFeeFromCheckoutSession } from "@/lib/stripe-fulfill-platform-setup-fee";
import { syncAccountStatus } from "@/lib/stripe-connect";

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    session_id?: string;
    platform_fee_paid?: string;
    stripe?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;
  const stripeReturnParam = Array.isArray(sp.stripe) ? sp.stripe[0] : sp.stripe;

  const returnQuery = new URLSearchParams();
  if (sp.session_id) returnQuery.set("session_id", sp.session_id);
  if (sp.platform_fee_paid) returnQuery.set("platform_fee_paid", sp.platform_fee_paid);
  const search = returnQuery.toString() ? `?${returnQuery.toString()}` : undefined;

  await requireStaffStepUpPage({
    user,
    pathname: `/organizer/events/${id}/edit`,
    search,
  });

  if (sp.session_id && sp.platform_fee_paid === "1") {
    await fulfillPlatformSetupFeeFromCheckoutSession(sp.session_id);
  }

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

  const vehicleRegistrationsAccess = await canManageVehicleRegistrations(
    user.id,
    id,
    user.platformRole,
  );

  const [
    memberships,
    staff,
    staffRoleDefinitions,
    tierRows,
    platformFee,
    eventSetupFee,
    eventCategoryRows,
    eventAwardRows,
    platformFeeStatus,
    activeVotingCategoryCount,
    totalVotingCategoryCount,
  ] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { userId: user.id },
      select: {
        role: true,
        organization: {
          select: { id: true, name: true, clubState: true, logo: true },
        },
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
    getEventSetupFee(),
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
    getEventPlatformFeeStatus(id),
    prisma.votingCategory.count({
      where: { eventId: id, isActive: true },
    }),
    prisma.votingCategory.count({
      where: { eventId: id },
    }),
  ]);

  const paymentSettingsComplete = Boolean(
    platformFeeStatus?.paymentEnabled && platformFeeStatus.paid,
  );
  const initialSmsVotingStatus =
    event.smsVotingEnabled && activeVotingCategoryCount > 0
      ? ("complete" as const)
      : !event.smsVotingEnabled &&
          (totalVotingCategoryCount > 0 ||
            event.smsVotingStartsAt ||
            event.smsVotingEndsAt)
        ? ("not_enabled" as const)
        : null;

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
  const flatSetupFeeLabel = formatEventSetupFeeLabel(eventSetupFee.amountCents);

  const unreadEventMessageCount = await countUnreadMessagesForUserAndEvent(
    user.id,
    id,
  );

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
    logo: m.organization.logo,
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

  let stripeRequirements: {
    currentlyDue: string[];
    pastDue: string[];
    disabledReason: string | null;
    requirementErrors: Array<{ code: string; reason: string; requirement: string }>;
  } | null = null;

  let stripeOrg = event.organization;

  if (
    isOrgOwner &&
    stripeOrg?.stripeAccountId &&
    process.env.STRIPE_SECRET_KEY?.trim()
  ) {
    try {
      const { org, sync } = await syncAccountStatus(stripeOrg.stripeAccountId);
      stripeOrg = {
        id: org.id,
        name: org.name,
        stripeAccountId: org.stripeAccountId,
        stripeAccountStatus: org.stripeAccountStatus,
        stripeChargesEnabled: org.stripeChargesEnabled,
        stripePayoutsEnabled: org.stripePayoutsEnabled,
        stripeDetailsSubmitted: org.stripeDetailsSubmitted,
      };
      stripeRequirements = {
        currentlyDue: sync.requirementsCurrentlyDue,
        pastDue: sync.requirementsPastDue,
        disabledReason: sync.disabledReason,
        requirementErrors: sync.requirementErrors,
      };
    } catch (err) {
      console.error("[EditEventPage] Stripe status sync failed", err);
    }
  }

  const stripeInfo: StripeConnectInfo | null = stripeOrg
    ? {
        orgId: stripeOrg.id,
        orgName: stripeOrg.name,
        stripeAccountId: stripeOrg.stripeAccountId,
        stripeAccountStatus: stripeOrg.stripeAccountStatus,
        chargesEnabled: stripeOrg.stripeChargesEnabled,
        payoutsEnabled: stripeOrg.stripePayoutsEnabled,
        detailsSubmitted: stripeOrg.stripeDetailsSubmitted,
        requirementsCurrentlyDue: stripeRequirements?.currentlyDue,
        requirementsPastDue: stripeRequirements?.pastDue,
        disabledReason: stripeRequirements?.disabledReason,
        requirementErrors: stripeRequirements?.requirementErrors,
      }
    : null;

  const stripeReturnNeedsAttention =
    stripeReturnParam === "incomplete" ||
    stripeReturnParam === "error" ||
    stripeReturnParam === "pending";
  const stripeConnectIncomplete =
    stripeInfo != null && !stripeInfo.chargesEnabled;
  const paymentSettingsDefaultOpen =
    stripeReturnNeedsAttention || stripeConnectIncomplete;

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
    rainDate: event.rainDate?.toISOString() ?? null,
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
    showNumber: event.showNumber,
  };

  return (
    <div className="page-shell max-w-6xl space-y-6">
      <div className="space-y-4 text-center sm:text-left">
        <Link
          href="/dashboard/events?tab=managing"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to my events
        </Link>
      </div>

      <div className="space-y-4">
        <EventOrganizerNavBar
          eventId={event.id}
          active="edit"
          user={user}
        />
        {vehicleRegistrationsAccess ? (
          <p className="text-sm text-muted-foreground">
            <Link
              href={`/organizer/events/${event.id}/vehicle-registrations`}
              className="font-medium text-foreground underline underline-offset-2"
            >
              Vehicle registrations
            </Link>
            {" — assign judges to vehicles and scorecard categories."}
          </p>
        ) : null}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Edit Event —{" "}
              <EventNameWithNumber
                name={event.name}
                showNumber={event.showNumber}
              />
            </h1>
            <ContextualHelpLink
              slug="create-and-publish-event"
              className="mt-2"
            />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <EventMessagesButton
              eventId={event.id}
              initialUnreadCount={unreadEventMessageCount}
            />
            <ContactSiteAdminButton
              eventId={event.id}
              eventLabel={`${formatEventShowNumber(event.showNumber)} ${event.name}`}
            />
          </div>
        </div>
      </div>

      {!event.orgId ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
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
        betweenOrganizerAndActions={
          <>
            <CollapsibleCard
              key={
                paymentSettingsDefaultOpen
                  ? "payment-settings-open"
                  : "payment-settings-collapsed"
              }
              title="Payment Settings"
              defaultOpen={paymentSettingsDefaultOpen}
              badge={paymentSettingsComplete ? <CompletedBadge /> : undefined}
            >
              <div id="payment-settings" className="scroll-mt-24">
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
                    eventStatus={event.status}
                    platformFeeMode={event.platformFeeMode}
                    convenienceFeeLabel={convenienceFeeLabel}
                    flatSetupFeeLabel={flatSetupFeeLabel}
                    setupFeeCollected={event.platformSetupFeeCollected}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Link this event to a club or organization to enable payment
                  settings.
                </p>
              )}
              </div>
            </CollapsibleCard>
            <CollapsibleCard title="Event Staffing" defaultOpen={false}>
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
              initialSmsVotingStatus={initialSmsVotingStatus}
              initialVehicleSaleEnabled={event.vehicleSaleInquiriesEnabled}
              eventSchedule={{
                startDate: event.startDate.toISOString(),
                endDate: event.endDate?.toISOString() ?? null,
                startTime: event.startTime,
                endTime: event.endTime,
                dailyHours: parseDailyHours(event.dailyHours),
                venueState: event.state,
              }}
            />
          </>
        }
      />
    </div>
  );
}
