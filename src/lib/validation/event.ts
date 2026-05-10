import { z } from "zod";
import { CONTACT_EMAIL_INVALID_MESSAGE } from "@/lib/email-contact";
import { normalizeWebsiteUrlForStorage } from "@/lib/website-url";

const dailyHourRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  timeZone: z
    .enum([
      "America/Los_Angeles",
      "America/Denver",
      "America/Chicago",
      "America/New_York",
      "America/Anchorage",
      "Pacific/Honolulu",
    ])
    .optional()
    .nullable(),
});

/**
 * Plain object schema without refinements.
 * Zod v4 forbids .partial() on schemas with superRefine, so we keep the
 * base object separate and add cross-field checks only on `createEventSchema`.
 */
const eventFieldsSchema = z.object({
  orgId: z.string().uuid().optional(),
  name: z.string().min(2, "Event name is required"),
  estimatedCarCount: z.number().int().min(0).optional().nullable(),
  description: z.string().optional(),
  venue: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  isMultiDay: z.boolean().optional(),
  dailyHours: z.array(dailyHourRowSchema).optional(),
  registrationFeeType: z
    .enum(["FREE", "PAID", "PAID_TIERED", "DONATION"])
    .optional()
    .nullable(),
  registrationFeeDollars: z.number().int().min(0).optional().nullable(),
  contactName: z.string().optional(),
  contactFirstName: z.string().optional(),
  contactLastName: z.string().optional(),
  contactEmail: z.preprocess(
    (v) => (v === null || v === undefined ? undefined : String(v)),
    z
      .union([
        z.literal(""),
        z
          .string()
          .min(1)
          .refine((s) => s.includes("@") && s.includes("."), {
            message: CONTACT_EMAIL_INVALID_MESSAGE,
          }),
      ])
      .optional()
  ),
  contactPhone: z.string().optional(),
  eventWebsite: z.preprocess(
    (v) =>
      v === null || v === undefined
        ? undefined
        : String(v).trim() === ""
          ? undefined
          : String(v).trim(),
    z
      .string()
      .optional()
      .refine(
        (s) =>
          s === undefined ||
          s === "" ||
          normalizeWebsiteUrlForStorage(s) !== undefined,
        { message: "Enter a valid website URL (e.g. example.com)" }
      )
      .transform((s) =>
        s === undefined || s === ""
          ? undefined
          : normalizeWebsiteUrlForStorage(s)
      ),
  ),
  socialHashtag: z.string().optional(),
  eventType: z.string().optional(),
  status: z
    .enum(["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"])
    .optional(),
  listingScheduledAt: z.string().optional().nullable(),
  lat: z.number().finite().optional(),
  lng: z.number().finite().optional(),
});

/** Calendar midnight UTC for `YYYY-MM-DD` (date-only semantics). */
function ymdUtcMidnightMs(ymd: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function utcCalendarTodayStartMs(): number {
  const n = new Date();
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
}

/** Create-only: schedule rows must not be before today (UTC calendar). */
function eventCreateScheduleDatesNotPast(
  data: z.infer<typeof eventFieldsSchema>,
  ctx: z.RefinementCtx
) {
  const rows = data.dailyHours;
  if (!rows?.length) return;
  const cutoff = utcCalendarTodayStartMs();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const ms = ymdUtcMidnightMs(row.date);
    if (ms === null) continue;
    if (ms < cutoff) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Event date cannot be in the past",
        path: ["dailyHours", i, "date"],
      });
      return;
    }
  }
}

function eventCrossFieldChecks(
  data: z.infer<typeof eventFieldsSchema>,
  ctx: z.RefinementCtx
) {
  const touchesSchedule =
    data.dailyHours !== undefined ||
    data.startDate !== undefined ||
    data.endDate !== undefined ||
    data.isMultiDay !== undefined;
  if (touchesSchedule) {
    const hasDaily = data.dailyHours != null && data.dailyHours.length > 0;
    const hasLegacyStart =
      data.startDate != null && String(data.startDate).trim().length > 0;
    if (!hasDaily && !hasLegacyStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Event date or schedule is required",
        path: ["startDate"],
      });
    }
  }
  if (data.status === "SCHEDULED") {
    const raw = data.listingScheduledAt;
    if (raw == null || String(raw).trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Scheduled Listing must have a Date and Time in the future",
        path: ["listingScheduledAt"],
      });
      return;
    }
    const t = new Date(raw);
    if (Number.isNaN(t.getTime()) || t.getTime() <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Scheduled Listing must have a Date and Time in the future",
        path: ["listingScheduledAt"],
      });
    }
  }
  const hasLat = data.lat !== undefined;
  const hasLng = data.lng !== undefined;
  if (hasLat !== hasLng) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Latitude and longitude must be sent together",
      path: ["lat"],
    });
  }
}

function rejectArchivedStatusOnCreate(
  data: z.infer<typeof eventFieldsSchema>,
  ctx: z.RefinementCtx
) {
  if (data.status === "ARCHIVED") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "New events cannot be created as archived",
      path: ["status"],
    });
  }
}

export const createEventSchema = eventFieldsSchema
  .superRefine(eventCrossFieldChecks)
  .superRefine(eventCreateScheduleDatesNotPast)
  .superRefine(rejectArchivedStatusOnCreate);

export const updateEventSchema = eventFieldsSchema.partial();

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
