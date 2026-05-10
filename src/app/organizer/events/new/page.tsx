import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canCreateEvent } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { EventForm } from "@/components/forms/event-form";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ orgId?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!canCreateEvent(user)) redirect("/dashboard/events");

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user.id },
    include: {
      organization: { select: { id: true, name: true, clubState: true } },
    },
    orderBy: { organization: { name: "asc" } },
  });
  const organizations = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    clubState: m.organization.clubState ?? null,
  }));

  const sp = await searchParams;
  const rawOrgId = sp.orgId;
  const requestedOrgId =
    typeof rawOrgId === "string"
      ? rawOrgId.trim()
      : Array.isArray(rawOrgId)
        ? rawOrgId[0]?.trim() ?? ""
        : "";
  const prefillHostingOrgId =
    requestedOrgId &&
    organizations.some((o) => o.id === requestedOrgId)
      ? requestedOrgId
      : undefined;

  return (
    <div className="page-shell max-w-5xl">
      <div className="mx-auto mb-6 max-w-2xl text-center sm:text-left">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to dashboard
        </Link>
      </div>
      <EventForm
        organizations={organizations}
        prefillHostingOrgId={prefillHostingOrgId}
      />
    </div>
  );
}
