import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { requireStaffStepUpPage } from "@/lib/require-organizer-step-up";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { EventOrganizerNavBar } from "@/components/organizer/event-organizer-nav-bar";
import { ContactSiteAdminButton } from "@/components/organizer/contact-site-admin-button";
import { formatEventShowNumber } from "@/lib/event-show-number";
import { ContextualHelpLink } from "@/components/help/contextual-help-link";
import {
  AwardsJudgingHub,
  type AwardsJudgingHubStats,
} from "@/components/organizer/awards-judging/awards-judging-hub";
import { countEventAwardTrophies } from "@/lib/event-awards-trophies";
import { loadEventVotingControl } from "@/lib/judging/event-voting-control";

type Props = { params: Promise<{ id: string }> };

export default async function AwardsJudgingHubPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id: eventId } = await params;

  await requireStaffStepUpPage({
    user,
    pathname: `/organizer/events/${eventId}/awards-judging`,
  });

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      showNumber: true,
      orgId: true,
      smsVotingEnabled: true,
      eventCategories: {
        select: {
          id: true,
          trophyCount: true,
          customName: true,
          category: { select: { name: true } },
        },
      },
      eventAwards: {
        select: {
          id: true,
          customName: true,
          specialAward: { select: { name: true } },
        },
      },
    },
  });
  if (!event) notFound();

  const allowed = await canManageEvent(
    user.id,
    eventId,
    event.orgId,
    user.platformRole,
  );
  if (!allowed) notFound();

  const [
    publicVotingCategoryCount,
    ballotCategoryCount,
    openBallotCategoryCount,
    scoreSheetTemplateCount,
  ] = await Promise.all([
    prisma.votingCategory.count({
      where: { eventId, isActive: true },
    }),
    prisma.judgeBallotCategory.count({ where: { eventId } }),
    prisma.judgeBallotCategory.count({
      where: { eventId, status: "OPEN" },
    }),
    prisma.eventJudgingTemplate.count({ where: { eventId } }),
  ]);

  const votingSnapshot = await loadEventVotingControl(eventId);

  const stats: AwardsJudgingHubStats = {
    publicVotingEnabled: event.smsVotingEnabled,
    publicVotingCategoryCount,
    ballotCategoryCount,
    openBallotCategoryCount,
    scoreSheetTemplateCount,
    eventVotingFinalized: votingSnapshot?.trophyWinnersEnabled ?? false,
    trophyCount: countEventAwardTrophies({
      categories: event.eventCategories.map((c) => ({
        id: c.id,
        name: c.customName?.trim() || c.category?.name || "Category",
        trophyCount: c.trophyCount,
      })),
      specialAwards: event.eventAwards.map((a) => ({
        id: a.id,
        name: a.specialAward?.name ?? a.customName ?? "Custom Award",
      })),
    }),
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Show #{formatEventShowNumber(event.showNumber)}
          </p>
          <h1 className="font-heading text-2xl font-bold">
            <EventNameWithNumber name={event.name} showNumber={event.showNumber} />
          </h1>
          <p className="mt-1 text-muted-foreground">
            Awards &amp; Judging Setup — choose a voting method to configure
          </p>
        </div>
        <ContactSiteAdminButton
          eventId={eventId}
          eventLabel={event.name}
        />
      </div>

      <EventOrganizerNavBar eventId={eventId} active="awards-judging" user={user} />

      <AwardsJudgingHub
        eventId={eventId}
        stats={stats}
        initialVotingSnapshot={votingSnapshot}
        isSiteAdmin={user.platformRole === "ADMIN"}
      />

      <ContextualHelpLink
        slug="review-awards-winners"
        className="text-center"
      />

      <p className="text-center text-sm text-muted-foreground">
        <Link href={`/organizer/events/${eventId}/edit`} className="underline">
          Back to event setup
        </Link>
      </p>
    </div>
  );
}
