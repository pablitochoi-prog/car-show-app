import { redirect } from "next/navigation";
import { getCurrentUser, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MyProfileClient } from "@/components/profile/my-profile-client";
import { splitUserDisplayName } from "@/lib/profile-display-name";
import { userHasProfilePhoto } from "@/lib/profile-photo-access";
import { canCreateOrganization } from "@/lib/permissions";

export default async function MyProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabaseUser = await getSession();
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
    user.lastName,
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
            select: {
              user: { select: { firstName: true, lastName: true, name: true } },
            },
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
      ? [owner.firstName, owner.lastName].filter(Boolean).join(" ") ||
        owner.name
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
    <MyProfileClient
      email={user.email}
      pendingEmail={pendingEmail}
      username={user.username}
      name={user.name}
      hasPhoto={userHasProfilePhoto(user.avatarUrl)}
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
      memberships={memberships}
      canCreateClub={canCreateOrganization(user)}
    />
  );
}
