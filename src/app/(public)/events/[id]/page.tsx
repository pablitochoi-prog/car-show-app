import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getEventForViewer } from "@/lib/event-access";
import { displayContactName } from "@/lib/contact-display";
import { EventRegistrationPage } from "@/components/registration/event-registration-page";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const viewer = await getCurrentUser();
  const event = await getEventForViewer(id, viewer?.id ?? null);
  if (!event) return { title: "Event not found" };
  return {
    title: `${event.name} | CarShowApp`,
    description: event.description ?? event.name,
  };
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  const event = await getEventForViewer(id, viewer?.id ?? null);

  if (!event) notFound();

  const [tierRows, vehicleRows] = await Promise.all([
    prisma.registrationTier.findMany({
      where: { eventId: id },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    viewer
      ? prisma.vehicle.findMany({
          where: { userId: viewer.id, archivedAt: null },
          orderBy: [{ make: "asc" }, { model: "asc" }],
        })
      : Promise.resolve([]),
  ]);

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
  }));

  const contactName = displayContactName(
    event.contactFirstName,
    event.contactLastName,
    event.contactName,
  );

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
        event={{
          id: event.id,
          name: event.name,
          description: event.description,
          status: event.status,
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
        isLoggedIn={!!viewer}
      />
    </div>
  );
}
