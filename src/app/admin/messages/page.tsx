import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import { AdminMessagesClient } from "@/components/messages/admin-messages-client";

export default async function AdminMessagesPage() {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) redirect("/dashboard");

  const messages = await prisma.message.findMany({
    include: {
      sender: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
      event: { select: { id: true, name: true, showNumber: true } },
      organization: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const serialized = messages.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {messages.length} message{messages.length !== 1 ? "s" : ""} across all
          events and users.
        </p>
      </div>

      <AdminMessagesClient
        initialMessages={serialized}
        currentUserId={user.id}
      />
    </div>
  );
}
