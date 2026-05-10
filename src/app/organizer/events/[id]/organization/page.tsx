import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEventAndLoad } from "@/lib/auth";
import { LinkEventOrganizationForm } from "@/components/forms/link-event-organization-form";

export default async function LinkEventOrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id: eventId } = await params;

  const [authResult, memberships] = await Promise.all([
    canManageEventAndLoad(user.id, eventId, user.platformRole),
    prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: { organization: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const { allowed, event } = authResult;
  if (!allowed || !event) notFound();

  const orgName = event.orgId
    ? memberships.find((m) => m.organization.id === event.orgId)?.organization
        .name ?? null
    : null;

  return (
    <div className="page-shell max-w-5xl">
      <div className="mx-auto mb-8 max-w-lg text-center sm:text-left">
        <Link
          href="/dashboard/events"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to my events
        </Link>
      </div>
      <LinkEventOrganizationForm
        eventId={event.id}
        eventName={event.name}
        linkedOrgName={orgName}
        memberships={memberships.map((m) => ({
          orgId: m.organization.id,
          name: m.organization.name,
          role: m.role,
        }))}
      />
    </div>
  );
}
