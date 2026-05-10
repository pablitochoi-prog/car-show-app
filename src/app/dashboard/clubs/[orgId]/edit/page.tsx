import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import { organizationToCarClubFormValues } from "@/lib/car-club-org-to-form-values";
import { EditCarClubForm } from "@/app/dashboard/clubs/edit-car-club-form";

export default async function EditCarClubPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { orgId } = await params;

  const admin = isSiteAdmin(user);

  if (admin) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) notFound();

    const initialValues = organizationToCarClubFormValues(org);
    const isArchived = org.archivedAt != null;

    return (
      <EditCarClubForm
        organizationId={orgId}
        initialValues={initialValues}
        isArchived={isArchived}
      />
    );
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_orgId: { userId: user.id, orgId },
    },
    include: { organization: true },
  });

  if (!membership) {
    notFound();
  }

  if (membership.role !== "owner") {
    redirect("/dashboard/clubs");
  }

  const initialValues = organizationToCarClubFormValues(membership.organization);
  const isArchived = membership.organization.archivedAt != null;

  return (
    <EditCarClubForm
      organizationId={orgId}
      initialValues={initialValues}
      isArchived={isArchived}
    />
  );
}
