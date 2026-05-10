import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createCarClubSchema } from "@/lib/validation/organization";
import { canCreateOrganization } from "@/lib/permissions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user.id },
    include: { organization: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    organizations: memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      description: m.organization.description,
      logo: m.organization.logo,
      role: m.role,
      createdAt: m.organization.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canCreateOrganization(user)) {
    return NextResponse.json(
      { error: "Your account does not have permission to create organizations. Contact a site admin to request Organizer access." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createCarClubSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const d = parsed.data;

  try {
    const org = await prisma.organization.create({
      data: {
        name: d.name.trim(),
        logo: d.logo ?? null,
        description: d.description?.trim() || null,
        motto: d.motto?.trim() || null,
        primaryMeetingLocation: d.primaryMeetingLocation?.trim() || null,
        meetingFrequency: d.meetingFrequency?.trim() || null,
        meetingTime: d.meetingTime?.trim() || null,
        meetingVenueName: d.meetingVenueName?.trim() || null,
        street: d.street?.trim() || null,
        city: d.city?.trim() || null,
        state: d.state?.trim() || null,
        zip: d.zip?.trim() || null,
        lat: d.lat ?? null,
        lng: d.lng ?? null,
        contactFirstName: d.contactFirstName?.trim() || null,
        contactLastName: d.contactLastName?.trim() || null,
        contactEmail: d.contactEmail?.trim() || null,
        contactPhone: d.contactPhone?.trim() || null,
        contactRole: d.contactRole?.trim() || null,
        websiteUrl: d.websiteUrl ?? null,
        facebookUrl: d.facebookUrl ?? null,
        instagramUrl: d.instagramUrl ?? null,
        youtubeUrl: d.youtubeUrl ?? null,
        tikTokUrl: d.tikTokUrl ?? null,
        openToPublic: d.openToPublic ?? true,
        requiresMemberAccount: d.requiresMemberAccount ?? false,
        yearFounded: d.yearFounded ?? null,
        clubState: d.clubState ?? null,
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        orgId: org.id,
        role: "owner",
      },
    });

    return NextResponse.json(
      {
        id: org.id,
        name: org.name,
        description: org.description,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/organizations]", err);
    const raw = err instanceof Error ? err.message : String(err);
    const hint =
      raw.includes("clubState") || raw.includes("does not exist")
        ? " Database may be missing the latest migration (run npm run db:migrate)."
        : "";
    return NextResponse.json(
      {
        error: `Could not save club.${hint}`,
        ...(process.env.NODE_ENV === "development" ? { detail: raw } : {}),
      },
      { status: 500 }
    );
  }
}
