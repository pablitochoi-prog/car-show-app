import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEventAndLoad } from "@/lib/auth";
import { TierManager } from "@/components/forms/tier-manager";

export default async function EventTiersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const { allowed, event } = await canManageEventAndLoad(user.id, id, user.platformRole);
  if (!allowed || !event) notFound();

  const tierRows = await prisma.registrationTier.findMany({
    where: { eventId: id },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const initialTiers = tierRows.map((t) => ({
    id: t.id,
    name: t.name,
    priceCents: t.priceCents,
    opensAt: t.opensAt?.toISOString() ?? null,
    closesAt: t.closesAt?.toISOString() ?? null,
    memberOnly: t.memberOnly,
    sortOrder: t.sortOrder,
  }));

  return (
    <div className="page-shell max-w-5xl">
      <div className="text-center sm:text-left">
        <Link
          href="/dashboard/events"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← My events
        </Link>
        <h1 className="mt-4 mb-6 text-2xl font-bold">
          Registration tiers — {event.name}
        </h1>
      </div>
      <TierManager eventId={id} initialTiers={initialTiers} />
    </div>
  );
}
