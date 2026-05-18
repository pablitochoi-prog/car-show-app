import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { userMailboxMessageWhere } from "@/lib/message-mailbox";
import { UserMessagesClient } from "@/components/messages/user-messages-client";

export default async function DashboardMessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const messages = await prisma.message.findMany({
    where: userMailboxMessageWhere(user.id),
    include: {
      sender: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
      event: { select: { id: true, name: true, showNumber: true } },
      organization: { select: { id: true, name: true } },
      userStates: {
        where: { userId: user.id },
        select: { archivedAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const serialized = messages.map((m) => ({
    id: m.id,
    type: m.type,
    subject: m.subject,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
    mailboxArchivedAt: m.userStates[0]?.archivedAt?.toISOString() ?? null,
    sender: m.sender,
    recipient: m.recipient,
    event: m.event,
    organization: m.organization,
  }));

  return (
    <div className="page-shell max-w-6xl space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inbox shows messages you received. Open a message to read it; select
          and use Unread to mark it unread again.
        </p>
      </div>

      <UserMessagesClient
        initialMessages={serialized}
        currentUserId={user.id}
      />
    </div>
  );
}
