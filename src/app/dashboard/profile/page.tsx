import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AccountSectionForm } from "@/components/profile/account-section-form";
import { MyClubsSection } from "@/components/profile/my-clubs-section";
import { splitUserDisplayName } from "@/lib/profile-display-name";
import { canCreateOrganization } from "@/lib/permissions";

export default async function MyProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabaseUser = await getSession();
  /* Supabase sets `new_email` on the auth user while an email change is pending. */
  const rawNewEmail = (supabaseUser as unknown as Record<string, unknown>)
    ?.new_email;
  const pendingEmail =
    typeof rawNewEmail === "string" &&
    rawNewEmail &&
    rawNewEmail.toLowerCase() !== user.email.toLowerCase()
      ? rawNewEmail
      : null;

  const { firstName, lastName } = splitUserDisplayName(
    user.name,
    user.firstName,
    user.lastName
  );

  const rawMemberships = await prisma.organizationMember.findMany({
    where: { userId: user.id },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          clubState: true,
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

  const memberships = rawMemberships.map((m) => {
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
        logo: m.organization.logo,
        motto: m.organization.motto,
        organizerName,
      },
    };
  });

  return (
    <div className="page-shell max-w-2xl space-y-8">
      <div className="page-head flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">My profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Account details from your CarShowApp profile.
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account information</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
            <AccountSectionForm
              email={user.email}
              pendingEmail={pendingEmail}
              username={user.username}
              initial={{
                firstName,
                lastName,
                birthYear: user.birthYear ?? null,
                phone: user.phone ?? "",
                street: user.street ?? "",
                city: user.city ?? "",
                state: user.state ?? "",
                zip: user.zip ?? "",
              }}
            />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My clubs</CardTitle>
        </CardHeader>
        <CardContent>
          <MyClubsSection
            memberships={memberships}
            canCreate={canCreateOrganization(user)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
