import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canCreateEvent } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { EventForm } from "@/components/forms/event-form";
import { ContextualHelpLink } from "@/components/help/contextual-help-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ orgId?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!canCreateEvent(user)) {
    return (
      <div className="page-shell max-w-2xl space-y-6">
        <Link
          href="/dashboard/events"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to events
        </Link>
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight">Create New Event</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Creating and managing car shows requires{" "}
            <strong className="font-medium text-foreground">
              Organizer
            </strong>{" "}
            access on your account. Contact a site administrator if you would
            like to host events on CarShowApp.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/events"
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            Back to My Events
          </Link>
          <Link
            href="/dashboard/profile"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            My Profile
          </Link>
        </div>
      </div>
    );
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user.id },
    include: {
      organization: {
        select: { id: true, name: true, clubState: true, logo: true },
      },
    },
    orderBy: { organization: { name: "asc" } },
  });
  const organizations = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    clubState: m.organization.clubState ?? null,
    logo: m.organization.logo,
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
      <div className="mx-auto mb-6 max-w-2xl space-y-3 text-center sm:text-left">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to dashboard
        </Link>
        <ContextualHelpLink slug="create-and-publish-event" />
      </div>
      <EventForm
        organizations={organizations}
        prefillHostingOrgId={prefillHostingOrgId}
      />
    </div>
  );
}
