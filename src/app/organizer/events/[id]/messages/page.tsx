import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEventAndLoad } from "@/lib/auth";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { OrganizerMessagesClient } from "@/components/messages/organizer-messages-client";

export default async function OrganizerEventMessagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id: eventId } = await params;

  const { allowed, event } = await canManageEventAndLoad(
    user.id,
    eventId,
    user.platformRole,
  );
  if (!allowed || !event) notFound();

  const messages = await prisma.message.findMany({
    where: { eventId },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
      event: { select: { id: true, name: true, showNumber: true } },
      organization: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const serialized = messages.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
  }));

  return (
    <div className="page-shell max-w-3xl space-y-6">
      <div className="text-sm text-muted-foreground">
        <Link href="/dashboard/events" className="hover:text-foreground">
          ← My events
        </Link>
        <span className="mx-2">·</span>
        <Link
          href={`/organizer/events/${eventId}/edit`}
          className="hover:text-foreground"
        >
          Edit event
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Messages —{" "}
          <EventNameWithNumber
            name={event.name}
            showNumber={event.showNumber}
          />
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {messages.length} message{messages.length !== 1 ? "s" : ""} for this
          event.
        </p>
      </div>

      <OrganizerMessagesClient
        initialMessages={serialized}
        currentUserId={user.id}
      />
    </div>
  );
}
