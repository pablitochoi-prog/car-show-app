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
import { ContextualHelpLink } from "@/components/help/contextual-help-link";
import { OrganizerRegistrationsClient } from "@/components/organizer/organizer-registrations-client";
import { ContactSiteAdminButton } from "@/components/organizer/contact-site-admin-button";
import { EventOrganizerNavBar } from "@/components/organizer/event-organizer-nav-bar";
import { EventSaleInquirySummary } from "@/components/organizer/event-sale-inquiry-summary";
import { loadEventSaleInquiryStats } from "@/lib/event-sale-inquiry-stats";
import { withPerfTiming } from "@/lib/perf-timing";
import {
  ORGANIZER_REGISTRATION_STATUS_FILTER_LABELS,
  loadOrganizerRegistrationsPage,
  parseOrganizerRegistrationsSearchParams,
} from "@/lib/organizer-registrations-list";

export default async function EventRegistrationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id: eventId } = await params;
  const sp = await searchParams;
  const listParams = parseOrganizerRegistrationsSearchParams(sp);

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
    select: {
      name: true,
      showNumber: true,
      vehicleSaleInquiriesEnabled: true,
    },
  });
  if (!event) notFound();

  const saleInquiryStatsPromise = event.vehicleSaleInquiriesEnabled
    ? loadEventSaleInquiryStats(eventId)
    : Promise.resolve(null);

  const [
    registrationsPage,
    platformFee,
    eventMeta,
    platformFeeStatus,
    saleInquiryStats,
  ] = await withPerfTiming(
    "page.organizer.registrations.load",
    { eventId },
    async () =>
      Promise.all([
        loadOrganizerRegistrationsPage(eventId, listParams),
        getPlatformFee(),
        prisma.event.findUnique({
          where: { id: eventId },
          select: {
            registrationFeeType: true,
            registrationFeeDollars: true,
          },
        }),
        getEventPlatformFeeStatus(eventId),
        saleInquiryStatsPromise,
      ]),
    (result) => ({
      success: result[1] != null,
      registrationCount: result[0].rows.length,
      totalCount: result[0].totalCount,
      page: result[0].page,
      pageSize: result[0].pageSize,
    }),
  );

  if (!eventMeta) notFound();

  const registrationFeeType =
    (eventMeta.registrationFeeType ?? "FREE") as RegistrationFeeType;

  const eventLabel = `${formatEventShowNumber(event.showNumber)} ${event.name}`;

  const hasActiveFilters =
    (listParams.statusFilter?.length ?? 0) > 0 ||
    (listParams.tierFilter?.length ?? 0) > 0;

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
        <EventOrganizerNavBar eventId={eventId} active="registrations" user={user} />
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
            {hasActiveFilters
              ? `${registrationsPage.totalCount} matching registrant${registrationsPage.totalCount === 1 ? "" : "s"} (${registrationsPage.eventTotalCount} total)`
              : `${registrationsPage.eventTotalCount} registrant${registrationsPage.eventTotalCount === 1 ? "" : "s"}`}
          </p>
          <ContextualHelpLink
            slug="manage-event-registrations"
            className="mt-2"
          />
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

      {saleInquiryStats ? (
        <EventSaleInquirySummary
          forSaleVehicleCount={saleInquiryStats.forSaleVehicleCount}
          inquiryCount={saleInquiryStats.inquiryCount}
        />
      ) : null}

      <OrganizerRegistrationsClient
        eventId={eventId}
        eventLabel={eventLabel}
        registrationInputs={registrationsPage.rows}
        registrationFeeType={registrationFeeType}
        suggestedDonationDollars={eventMeta.registrationFeeDollars}
        platformFee={platformFee}
        isDonationEvent={registrationFeeType === "DONATION"}
        dashCardsAllowed={platformFeeStatus?.paid ?? true}
        dashCardsBlockedMessage={platformFeeStatus?.dashCardsBlockedMessage}
        listParams={registrationsPage.params}
        pagination={{
          page: registrationsPage.page,
          pageSize: registrationsPage.pageSize,
          totalCount: registrationsPage.totalCount,
          totalPages: registrationsPage.totalPages,
          eventTotalCount: registrationsPage.eventTotalCount,
        }}
        statusFilterOptions={[...ORGANIZER_REGISTRATION_STATUS_FILTER_LABELS]}
        tierFilterOptions={registrationsPage.tierFilterOptions}
      />
    </div>
  );
}
