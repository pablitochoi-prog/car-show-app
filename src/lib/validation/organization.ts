import { z } from "zod";
import { CONTACT_EMAIL_INVALID_MESSAGE } from "@/lib/email-contact";
import { normalizeWebsiteUrlForStorage } from "@/lib/website-url";
import { US_STATE_CODES } from "@/lib/us-state-codes";

const US_STATE_SET = new Set<string>(US_STATE_CODES);

function optionalCoord() {
  return z.preprocess((v: unknown) => {
    if (v === null || v === undefined || v === "") return undefined;
    const n = typeof v === "number" ? v : Number(String(v).trim());
    return Number.isFinite(n) ? n : undefined;
  }, z.number().finite().optional());
}

function optionalClubState() {
  return z.preprocess((v: unknown) => {
    if (v == null || v === undefined || String(v).trim() === "") return undefined;
    return String(v).trim().toUpperCase();
  }, z.union([
    z.undefined(),
    z
      .string()
      .length(2)
      .refine((code) => US_STATE_SET.has(code), "Select a valid state"),
  ]));
}

function optionalYearFounded() {
  return z.preprocess((v: unknown) => {
    if (v === null || v === undefined || v === "") return undefined;
    const n = parseInt(String(v), 10);
    return Number.isFinite(n) ? n : undefined;
  }, z.number().int().min(1800).max(2100).optional().nullable());
}

function optionalSocialUrl() {
  return z.preprocess(
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
        { message: "Enter a valid URL (e.g. facebook.com/yourclub)" }
      )
      .transform((s) =>
        s === undefined || s === ""
          ? undefined
          : normalizeWebsiteUrlForStorage(s)
      )
  );
}

const optionalContactEmail = z.preprocess(
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
);

export const createCarClubSchema = z
  .object({
    name: z.string().min(2, "Club name is required"),
    description: z.string().optional(),
    motto: z.string().optional(),
    logo: z.preprocess(
      (v) =>
        v === null || v === undefined || String(v).trim() === ""
          ? undefined
          : String(v).trim(),
      z.string().url().optional()
    ),
    primaryMeetingLocation: z.string().optional(),
    meetingFrequency: z.string().optional(),
    meetingTime: z.string().optional(),
    meetingVenueName: z.string().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    lat: optionalCoord(),
    lng: optionalCoord(),
    contactFirstName: z.string().optional(),
    contactLastName: z.string().optional(),
    contactEmail: optionalContactEmail,
    contactPhone: z.string().optional(),
    contactRole: z.string().optional(),
    websiteUrl: optionalSocialUrl(),
    facebookUrl: optionalSocialUrl(),
    instagramUrl: optionalSocialUrl(),
    youtubeUrl: optionalSocialUrl(),
    tikTokUrl: optionalSocialUrl(),
    openToPublic: z.boolean().optional(),
    requiresMemberAccount: z.boolean().optional(),
    yearFounded: optionalYearFounded(),
    clubState: optionalClubState(),
  })
  .superRefine((data, ctx) => {
    const hasLat = data.lat != null && Number.isFinite(data.lat);
    const hasLng = data.lng != null && Number.isFinite(data.lng);
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Latitude and longitude must both be filled in or both left blank",
        path: ["lat"],
      });
    }
  });

export type CreateCarClubInput = z.infer<typeof createCarClubSchema>;
