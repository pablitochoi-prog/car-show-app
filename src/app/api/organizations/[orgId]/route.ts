import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireOrgOwner } from "@/lib/auth";
import { createCarClubSchema } from "@/lib/validation/organization";
import { isSiteAdmin } from "@/lib/permissions";

type RouteParams = { params: Promise<{ orgId: string }> };

/** Full replace of car-club fields (same validation as create). Owner only. */
export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;
  if (!orgId) {
    return NextResponse.json({ error: "Missing organization id" }, { status: 400 });
  }

  if (!isSiteAdmin(user)) {
    try {
      await requireOrgOwner(user.id, orgId);
    } catch {
      return NextResponse.json(
        { error: "Only the club owner can edit this organization." },
        { status: 403 }
      );
    }
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
    const org = await prisma.organization.update({
      where: { id: orgId },
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

    return NextResponse.json({
      id: org.id,
      name: org.name,
      description: org.description,
    });
  } catch (err) {
    console.error("[PATCH /api/organizations/[orgId]]", err);
    const raw = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "Could not update club.",
        ...(process.env.NODE_ENV === "development" ? { detail: raw } : {}),
      },
      { status: 500 }
    );
  }
}

/** Permanently delete organization (events keep rows with orgId set null). Owner only. */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;
  if (!orgId) {
    return NextResponse.json({ error: "Missing organization id" }, { status: 400 });
  }

  if (!isSiteAdmin(user)) {
    try {
      await requireOrgOwner(user.id, orgId);
    } catch {
      return NextResponse.json(
        { error: "Only the club owner can delete this organization." },
        { status: 403 }
      );
    }
  }

  try {
    await prisma.organization.delete({
      where: { id: orgId },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/organizations/[orgId]]", err);
    const raw = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "Could not delete club.",
        ...(process.env.NODE_ENV === "development" ? { detail: raw } : {}),
      },
      { status: 500 }
    );
  }
}
