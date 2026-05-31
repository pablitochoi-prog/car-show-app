import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  canManageEvent,
  getOrgMembership,
  writeAccessDeniedResponse,
} from "@/lib/auth";
import { geocodeAddress } from "@/lib/geocoding";
import { updateEventSchema } from "@/lib/validation/event";
import { deriveFieldsFromDailyHours, utcDateFromYmd } from "@/lib/daily-hours";
import { resolveListingScheduledAtForPersistence } from "@/lib/listing-scheduled";
import type { EventStatus, Prisma } from "@prisma/client";
import { syncGeneralAdmissionTier } from "@/lib/general-admission-tier";
import {
  FLAT_PLATFORM_FEE_UNPAID_LISTING_MESSAGE,
  isEventPlatformBillingConfigured,
  requiresFlatPlatformFeePaymentBeforeListing,
} from "@/lib/event-platform-fee";
import { validateEventListingDates } from "@/lib/event-listing-date-guards";

type FeeType = "FREE" | "PAID" | "PAID_TIERED" | "DONATION";

function resolveRegistrationFeePatch(
  existing: {
    registrationFeeType: FeeType | null;
    registrationFeeDollars: number | null;
  },
  d: {
    registrationFeeType?: FeeType | null;
    registrationFeeDollars?: number | null;
  }
): { registrationFeeType: FeeType; registrationFeeDollars: number | null } {
  const type =
    d.registrationFeeType !== undefined
      ? d.registrationFeeType
      : existing.registrationFeeType ?? "FREE";
  if (type === "FREE") {
    return { registrationFeeType: "FREE", registrationFeeDollars: null };
  }
  if (type === "PAID_TIERED") {
    return { registrationFeeType: "PAID_TIERED", registrationFeeDollars: null };
  }
  if (type === "PAID") {
    const dollars =
      d.registrationFeeDollars !== undefined
        ? d.registrationFeeDollars
        : existing.registrationFeeDollars ?? 0;
    return { registrationFeeType: "PAID", registrationFeeDollars: dollars };
  }
  const dollars =
    d.registrationFeeDollars !== undefined
      ? d.registrationFeeDollars
      : existing.registrationFeeDollars;
  return { registrationFeeType: "DONATION", registrationFeeDollars: dollars };
}

type RouteParams = { params: Promise<{ id: string }> };

function patchEventErrorResponse(err: unknown) {
  console.error("[PATCH /api/events/:id]", err);
  const message = err instanceof Error ? err.message : String(err);
  const schemaMismatch =
    /eventWebsite|does not exist|Unknown column|no such column|type .* does not exist|22P02/i.test(
      message
    );
  const hint = schemaMismatch
    ? "Database is missing a column or type the app expects. Run: npx prisma db push (then restart the dev server)."
    : "Could not update event. Please try again.";
  return NextResponse.json(
    {
      error: hint,
      ...(process.env.NODE_ENV === "development" ? { detail: message } : {}),
    },
    { status: 500 }
  );
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const writeDenied = writeAccessDeniedResponse(user);
  if (writeDenied) return writeDenied;

  const { id: eventId } = await params;

  const allowed = await canManageEvent(user.id, eventId, undefined, user.platformRole);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateEventSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const d = parsed.data;
  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (d.status === "ARCHIVED") {
    await prisma.event.update({
      where: { id: eventId },
      data: { status: "ARCHIVED" },
    });
    return NextResponse.json({
      id: eventId,
      name: existing.name,
      status: "ARCHIVED" as const,
    });
  }

  if (d.orgId !== undefined && d.orgId !== existing.orgId) {
    if (existing.orgId != null) {
      return NextResponse.json(
        { error: "Organization is already set for this event" },
        { status: 400 }
      );
    }
    const membership = await getOrgMembership(user.id, d.orgId);
    if (!membership) {
      return NextResponse.json(
        { error: "You must be a member of that organization to link it" },
        { status: 403 }
      );
    }
  }

  const nextStreet = d.street !== undefined ? d.street : existing.street;
  const nextCity = d.city !== undefined ? d.city : existing.city;
  const nextState = d.state !== undefined ? d.state : existing.state;
  const nextZip = d.zip !== undefined ? d.zip : existing.zip;

  const addressChanged =
    d.street !== undefined ||
    d.city !== undefined ||
    d.state !== undefined ||
    d.zip !== undefined;

  let lat = existing.lat;
  let lng = existing.lng;
  if (addressChanged) {
    const explicitCoords =
      d.lat !== undefined &&
      d.lng !== undefined &&
      Number.isFinite(d.lat) &&
      Number.isFinite(d.lng);
    if (explicitCoords) {
      lat = d.lat!;
      lng = d.lng!;
    } else {
      const coords = await geocodeAddress({
        street: nextStreet,
        city: nextCity,
        state: nextState,
        zip: nextZip,
      });
      lat = coords?.lat ?? null;
      lng = coords?.lng ?? null;
    }
  }

  let startDate = existing.startDate;
  let endDate = existing.endDate;
  let isMultiDay = existing.isMultiDay;
  let startTime = existing.startTime;
  let endTime = existing.endTime;
  let dailyHoursPatch: Prisma.InputJsonValue | undefined;

  if (d.dailyHours !== undefined) {
    if (!d.dailyHours.length) {
      return NextResponse.json(
        { error: "Add at least one event day" },
        { status: 400 }
      );
    }
    try {
      const derived = deriveFieldsFromDailyHours(d.dailyHours);
      startDate = derived.startDate;
      endDate = derived.endDate;
      isMultiDay = derived.isMultiDay;
      startTime = derived.startTime;
      endTime = derived.endTime;
      dailyHoursPatch = derived.dailyHours as unknown as Prisma.InputJsonValue;
    } catch {
      return NextResponse.json({ error: "Invalid schedule" }, { status: 400 });
    }
  } else {
    if (d.startDate) {
      const sd = new Date(d.startDate);
      if (Number.isNaN(sd.getTime())) {
        return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
      }
      startDate = sd;
    }

    if (d.endDate !== undefined) {
      if (d.endDate === null || d.endDate === "") {
        endDate = null;
      } else {
        const ed = new Date(d.endDate);
        if (Number.isNaN(ed.getTime())) {
          return NextResponse.json({ error: "Invalid end date" }, { status: 400 });
        }
        endDate = ed;
      }
    }
    if (d.isMultiDay !== undefined) {
      isMultiDay = d.isMultiDay;
    }
    if (d.startTime !== undefined) {
      startTime = d.startTime || null;
    }
    if (d.endTime !== undefined) {
      endTime = d.endTime || null;
    }
  }

  const feePatch =
    d.registrationFeeType !== undefined || d.registrationFeeDollars !== undefined
      ? resolveRegistrationFeePatch(existing, d)
      : null;

  const listingLifecycle = new Set<EventStatus>([
    "DRAFT",
    "SCHEDULED",
    "PUBLISHED",
  ]);

  let status: EventStatus | undefined;
  if (
    d.status !== undefined &&
    listingLifecycle.has(existing.status) &&
    listingLifecycle.has(d.status as EventStatus)
  ) {
    status = d.status as EventStatus;
  }

  const effectiveStatus = (status ?? existing.status) as EventStatus;
  if (
    (effectiveStatus === "PUBLISHED" || effectiveStatus === "SCHEDULED") &&
    existing.orgId
  ) {
    const org = await prisma.organization.findUnique({
      where: { id: existing.orgId },
      select: { stripeChargesEnabled: true },
    });
    if (org?.stripeChargesEnabled && !isEventPlatformBillingConfigured(existing)) {
      return NextResponse.json(
        {
          error:
            "Choose and save your platform fee billing option in Payment Settings before publishing or scheduling this event.",
        },
        { status: 400 },
      );
    }
    if (
      requiresFlatPlatformFeePaymentBeforeListing({
        platformFeeMode: existing.platformFeeMode,
        platformSetupFeeCollected: existing.platformSetupFeeCollected,
      })
    ) {
      return NextResponse.json(
        { error: FLAT_PLATFORM_FEE_UNPAID_LISTING_MESSAGE },
        { status: 400 },
      );
    }

    const mergedDailyHours =
      dailyHoursPatch !== undefined ? d.dailyHours : existing.dailyHours;
    const mergedRainDate =
      d.rainDate !== undefined ? d.rainDate : existing.rainDate;
    const dateError = await validateEventListingDates(prisma, eventId, {
      dailyHours: mergedDailyHours,
      rainDate:
        mergedRainDate instanceof Date
          ? mergedRainDate.toISOString().slice(0, 10)
          : typeof mergedRainDate === "string"
            ? mergedRainDate
            : null,
    });
    if (dateError) {
      return NextResponse.json({ error: dateError }, { status: 400 });
    }
  }

  let listingScheduledAtPatch: Date | null | undefined = undefined;
  if (d.status !== undefined || d.listingScheduledAt !== undefined) {
    const effectiveStatus = (status ?? existing.status) as EventStatus;
    const iso =
      d.listingScheduledAt !== undefined
        ? d.listingScheduledAt
        : existing.listingScheduledAt?.toISOString() ?? null;
    listingScheduledAtPatch = resolveListingScheduledAtForPersistence({
      status: effectiveStatus,
      listingScheduledAtIso: iso,
    });
  }

  if (
    listingScheduledAtPatch !== undefined &&
    listingScheduledAtPatch !== null &&
    Number.isNaN(listingScheduledAtPatch.getTime())
  ) {
    return NextResponse.json(
      { error: "Invalid listing scheduled date or time" },
      { status: 400 }
    );
  }

  const shouldSyncGeneralAdmission =
    feePatch != null || d.registrationFeeDollars !== undefined;

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      ...(d.orgId !== undefined ? { orgId: d.orgId } : {}),
      name: d.name ?? undefined,
      ...(d.estimatedCarCount !== undefined
        ? { estimatedCarCount: d.estimatedCarCount }
        : {}),
      description:
        d.description !== undefined ? d.description || null : undefined,
      venue: d.venue !== undefined ? d.venue || null : undefined,
      street: d.street !== undefined ? d.street || null : undefined,
      city: d.city !== undefined ? d.city || null : undefined,
      state: d.state !== undefined ? d.state || null : undefined,
      zip: d.zip !== undefined ? d.zip || null : undefined,
      lat,
      lng,
      startDate,
      endDate,
      startTime,
      endTime,
      isMultiDay,
      ...(d.dailyHours !== undefined ? { dailyHours: dailyHoursPatch } : {}),
      ...(d.rainDate !== undefined
        ? {
            rainDate:
              d.rainDate && String(d.rainDate).trim()
                ? utcDateFromYmd(String(d.rainDate).trim())
                : null,
          }
        : {}),
      ...(feePatch
        ? {
            registrationFeeType: feePatch.registrationFeeType,
            registrationFeeDollars: feePatch.registrationFeeDollars,
          }
        : {}),
      contactName:
        d.contactName !== undefined ? d.contactName || null : undefined,
      contactFirstName:
        d.contactFirstName !== undefined
          ? d.contactFirstName?.trim() || null
          : undefined,
      contactLastName:
        d.contactLastName !== undefined
          ? d.contactLastName?.trim() || null
          : undefined,
      contactEmail:
        d.contactEmail !== undefined
          ? d.contactEmail?.trim() || null
          : undefined,
      contactPhone:
        d.contactPhone !== undefined ? d.contactPhone || null : undefined,
      eventWebsite:
        d.eventWebsite !== undefined ? d.eventWebsite ?? null : undefined,
      socialHashtag:
        d.socialHashtag !== undefined ? d.socialHashtag || null : undefined,
      eventType: d.eventType !== undefined ? d.eventType || undefined : undefined,
      ...(status !== undefined ? { status } : {}),
      ...(listingScheduledAtPatch !== undefined
        ? { listingScheduledAt: listingScheduledAtPatch }
        : {}),
    },
  });

  if (shouldSyncGeneralAdmission) {
    await syncGeneralAdmissionTier(
      eventId,
      updated.registrationFeeType,
      updated.registrationFeeDollars,
    );
  }

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    status: updated.status,
  });
  } catch (err) {
    return patchEventErrorResponse(err);
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: eventId } = await params;

    const allowed = await canManageEvent(user.id, eventId, undefined, user.platformRole);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.event.delete({ where: { id: eventId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return patchEventErrorResponse(err);
  }
}
