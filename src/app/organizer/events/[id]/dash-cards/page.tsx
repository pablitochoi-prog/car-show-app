import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canManageEventRegistrations } from "@/lib/organizer-registrations-auth";
import { loadDashCardModelsForRegistrations } from "@/lib/dash-cards-for-registrations";
import { DashCardPreview } from "@/components/dash-card/dash-card-preview";
import { DashCardPrintButton } from "@/components/dash-card/dash-card-print-button";
import { prisma } from "@/lib/db";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";

export const metadata: Metadata = {
  title: "Dash cards | Organizer",
  robots: { index: false, follow: false },
};

export default async function OrganizerDashCardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ids?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id: eventId } = await params;
  const { ids: idsParam } = await searchParams;

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

  const registrationIds = (idsParam ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const cards = await loadDashCardModelsForRegistrations(
    eventId,
    registrationIds,
  );

  return (
    <div className="page-shell max-w-6xl space-y-6 bg-slate-100 print:bg-white print:py-0">
      <div className="layout-bar flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="space-y-1">
          <Link
            href={`/organizer/events/${eventId}/registrations`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Registrations
          </Link>
          <h1 className="text-xl font-semibold">
            Dash cards —{" "}
            <EventNameWithNumber
              name={event.name}
              showNumber={event.showNumber}
            />
          </h1>
          <p className="text-sm text-muted-foreground">
            {registrationIds.length} registration
            {registrationIds.length === 1 ? "" : "s"} selected · {cards.length}{" "}
            card{cards.length === 1 ? "" : "s"}. Each card prints on one US Letter
            sheet (8.5&quot; × 11&quot;) in landscape.
          </p>
        </div>
        <DashCardPrintButton />
      </div>

      {cards.length === 0 ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-6 text-center text-sm print:hidden">
          <p className="font-medium text-amber-950 dark:text-amber-100">
            No dash cards could be loaded
          </p>
          <p className="mt-2 text-muted-foreground">
            The selected registration ids may be invalid, or you may not have
            permission to view this event.
          </p>
          <Link
            href={`/organizer/events/${eventId}/registrations`}
            className="mt-4 inline-block font-medium text-primary hover:underline"
          >
            ← Back to registrations
          </Link>
        </div>
      ) : (
        <div className="space-y-8 print:space-y-0">
          {cards.map((data, i) => (
            <div
              key={`${data.owner.name}-${data.vehicle.make}-${data.vehicle.model}-${i}`}
              className="dash-card-print-page"
            >
              <DashCardPreview data={data} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
