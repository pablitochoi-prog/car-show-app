import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireOrgMember } from "@/lib/auth";
import { geocodeAddress } from "@/lib/geocoding";
import { createEventSchema } from "@/lib/validation/event";
import { deriveFieldsFromDailyHours } from "@/lib/daily-hours";
import { resolveListingScheduledAtForPersistence } from "@/lib/listing-scheduled";
import { canCreateEvent } from "@/lib/permissions";
import {
  ensureDefaultEventRoles,
  upsertStaffMemberWithRoles,
} from "@/lib/event-staff";
import type { EventStatus, Prisma } from "@prisma/client";

/** Prisma and cookies require Node; avoids accidental Edge bundling. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveRegistrationFee(d: {
  registrationFeeType?: "FREE" | "PAID" | "PAID_TIERED" | "DONATION" | null;
  registrationFeeDollars?: number | null;
}): { registrationFeeType: "FREE" | "PAID" | "PAID_TIERED" | "DONATION"; registrationFeeDollars: number | null } {
  const type = d.registrationFeeType ?? "FREE";
  if (type === "FREE") {
    return { registrationFeeType: "FREE", registrationFeeDollars: null };
  }
  if (type === "PAID") {
    const dollars = d.registrationFeeDollars ?? 0;
    return { registrationFeeType: "PAID", registrationFeeDollars: dollars };
  }
  if (type === "PAID_TIERED") {
    return { registrationFeeType: "PAID_TIERED", registrationFeeDollars: null };
  }
  return {
    registrationFeeType: "DONATION",
    registrationFeeDollars:
      d.registrationFeeDollars != null ? d.registrationFeeDollars : null,
  };
}

function postEventErrorResponse(err: unknown) {
  console.error("[POST /api/events]", err);
  const message = err instanceof Error ? err.message : String(err);
  const schemaMismatch =
    /eventWebsite|does not exist|Unknown column|no such column|type .* does not exist|22P02/i.test(
      message
    );
  const hint = schemaMismatch
    ? "Database is missing a column or type the app expects. Run: npx prisma db push (then restart the dev server)."
    : "Could not create event. Please try again.";
  return NextResponse.json(
    {
      error: hint,
      ...(process.env.NODE_ENV === "development" ? { detail: message } : {}),
    },
    { status: 500 }
  );
}

export async function POST(request: Request) {
  try {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canCreateEvent(user)) {
    return NextResponse.json(
      { error: "Your account does not have permission to create events. Contact a site admin to request Organizer access." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const d = parsed.data;

  if (d.orgId) {
    try {
      await requireOrgMember(user.id, d.orgId);
    } catch {
      return NextResponse.json(
        {
          error:
            "You must be associated with that organization on your profile to host under it",
        },
        { status: 403 }
      );
    }
  }

  let startDate: Date;
  let endDate: Date | null;
  let isMultiDay: boolean;
  let startTime: string | null;
  let endTime: string | null;
  let dailyHoursCreate: Prisma.InputJsonValue | undefined;

  if (d.dailyHours && d.dailyHours.length > 0) {
    try {
      const derived = deriveFieldsFromDailyHours(d.dailyHours);
      startDate = derived.startDate;
      endDate = derived.endDate;
      isMultiDay = derived.isMultiDay;
      startTime = derived.startTime;
      endTime = derived.endTime;
      dailyHoursCreate = derived.dailyHours as unknown as Prisma.InputJsonValue;
    } catch {
      return NextResponse.json({ error: "Invalid schedule" }, { status: 400 });
    }
  } else {
    const sd = new Date(d.startDate!);
    if (Number.isNaN(sd.getTime())) {
      return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
    }
    startDate = sd;
    endDate = null;
    if (d.endDate) {
      const ed = new Date(d.endDate);
      if (Number.isNaN(ed.getTime())) {
        return NextResponse.json({ error: "Invalid end date" }, { status: 400 });
      }
      endDate = ed;
    }
    isMultiDay = d.isMultiDay ?? false;
    startTime = d.startTime || null;
    endTime = d.endTime || null;
  }

  let coords: { lat: number; lng: number } | null = null;
  if (
    d.lat !== undefined &&
    d.lng !== undefined &&
    Number.isFinite(d.lat) &&
    Number.isFinite(d.lng)
  ) {
    coords = { lat: d.lat, lng: d.lng };
  } else {
    coords = await geocodeAddress({
      street: d.street,
      city: d.city,
      state: d.state,
      zip: d.zip,
    });
  }

  let status: EventStatus = "DRAFT";
  if (d.status === "PUBLISHED") status = "PUBLISHED";
  else if (d.status === "SCHEDULED") status = "SCHEDULED";

  const fee = resolveRegistrationFee(d);

  const listingScheduledAt = resolveListingScheduledAtForPersistence({
    status,
    listingScheduledAtIso: d.listingScheduledAt ?? null,
  });
  if (
    listingScheduledAt != null &&
    Number.isNaN(listingScheduledAt.getTime())
  ) {
    return NextResponse.json(
      { error: "Invalid listing scheduled date or time" },
      { status: 400 }
    );
  }

  const event = await prisma.event.create({
    data: {
      orgId: d.orgId ?? null,
      name: d.name,
      estimatedCarCount:
        d.estimatedCarCount !== undefined && d.estimatedCarCount !== null
          ? d.estimatedCarCount
          : null,
      description: d.description || null,
      venue: d.venue || null,
      street: d.street || null,
      city: d.city || null,
      state: d.state || null,
      zip: d.zip || null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      startDate,
      endDate,
      startTime,
      endTime,
      isMultiDay,
      ...(dailyHoursCreate !== undefined ? { dailyHours: dailyHoursCreate } : {}),
      registrationFeeType: fee.registrationFeeType,
      registrationFeeDollars: fee.registrationFeeDollars,
      contactName: d.contactName || null,
      contactFirstName: d.contactFirstName?.trim() || null,
      contactLastName: d.contactLastName?.trim() || null,
      contactEmail: d.contactEmail?.trim() || null,
      contactPhone: d.contactPhone || null,
      eventWebsite: d.eventWebsite ?? null,
      socialHashtag: d.socialHashtag || null,
      eventType: d.eventType?.trim() || "car_show",
      status,
      listingScheduledAt,
    },
  });

  await ensureDefaultEventRoles(event.id);
  const organizerRole = await prisma.eventRoleDefinition.findFirst({
    where: { eventId: event.id, slug: "organizer" },
    select: { id: true },
  });
  if (organizerRole) {
    await upsertStaffMemberWithRoles(event.id, user.id, [organizerRole.id]);
  }

  // Auto-create a default tier for flat-rate / free / donation events.
  // PAID_TIERED events skip this — organizer sets up tiers manually.
  if (fee.registrationFeeType !== "PAID_TIERED") {
    const tierPrice =
      fee.registrationFeeType === "PAID" && fee.registrationFeeDollars
        ? fee.registrationFeeDollars * 100
        : 0;
    await prisma.registrationTier.create({
      data: {
        eventId: event.id,
        name: "General Admission",
        priceCents: tierPrice,
        sortOrder: 0,
      },
    });
  }

  return NextResponse.json(
    {
      id: event.id,
      name: event.name,
      status: event.status,
    },
    { status: 201 }
  );
  } catch (err) {
    return postEventErrorResponse(err);
  }
}
