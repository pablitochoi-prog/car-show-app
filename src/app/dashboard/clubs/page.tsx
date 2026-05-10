import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canCreateEvent, canCreateOrganization } from "@/lib/permissions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ClubsList } from "@/components/dashboard/clubs/clubs-list";

export default async function MyClubsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user.id },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          clubState: true,
          description: true,
          archivedAt: true,
          logo: true,
          motto: true,
          members: {
            where: { role: "owner" },
            select: { user: { select: { firstName: true, lastName: true, name: true } } },
            take: 1,
          },
        },
      },
    },
    orderBy: { organization: { name: "asc" } },
  });

  const serialized = memberships.map((m) => {
    const owner = m.organization.members[0]?.user;
    const organizerName = owner
      ? [owner.firstName, owner.lastName].filter(Boolean).join(" ") || owner.name
      : null;
    return {
      id: m.id,
      role: m.role,
      organization: {
        id: m.organization.id,
        name: m.organization.name,
        clubState: m.organization.clubState,
        description: m.organization.description,
        archivedAt: m.organization.archivedAt?.toISOString() ?? null,
        logo: m.organization.logo,
        motto: m.organization.motto,
        organizerName,
      },
    };
  });

  return (
    <div className="page-shell max-w-3xl space-y-8">
      <div className="page-head flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">My clubs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Car clubs and organizations you belong to on CarShowApp.
          </p>
        </div>
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-full justify-center sm:w-auto"
          )}
        >
          Back to dashboard
        </Link>
      </div>

      <ClubsList
        initialMemberships={serialized}
        canCreateEvent={canCreateEvent(user)}
        canCreateOrg={canCreateOrganization(user)}
      />
    </div>
  );
}
