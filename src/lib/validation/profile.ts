import { z } from "zod";

/** Same optional phone pipeline as signup: digits → masked (###) ###-####. */
const optionalMaskedUsPhone = z
  .string()
  .optional()
  .transform((s) => {
    if (s == null || !String(s).trim()) return undefined;
    const digits = String(s).replace(/\D/g, "").slice(0, 10);
    return digits.length === 0 ? undefined : digits;
  })
  .refine(
    (d) => d === undefined || d.length === 10,
    "Enter a complete 10-digit phone number or leave this field blank."
  )
  .transform((d) =>
    d === undefined
      ? undefined
      : `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  );

function trimOrNull(s: string | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  return t === "" ? null : t;
}

const currentCalendarYear = () => new Date().getFullYear();

/** Optional birth year; empty clears. Four-digit calendar year. */
const optionalBirthYear = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return undefined;
  const n =
    typeof val === "number"
      ? val
      : parseInt(String(val).replace(/\D/g, "").slice(0, 4), 10);
  if (!Number.isFinite(n)) return undefined;
  return n;
}, z.number().int().min(1900).max(currentCalendarYear()).optional());

/** JSON may send `null`; Google standardized lines can be long — clamp server-side. */
const optionalTrimmed = (max: number) =>
  z.preprocess((val) => {
    if (val === null || val === undefined) return undefined;
    return String(val).trim().slice(0, max);
  }, z.string().max(max).optional());

export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(80)
    .transform((s) => s.trim()),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(80)
    .transform((s) => s.trim()),
  birthYear: optionalBirthYear,
  phone: optionalMaskedUsPhone,
  street: optionalTrimmed(500),
  city: optionalTrimmed(120),
  state: optionalTrimmed(50),
  zip: optionalTrimmed(20),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** Normalize optional address strings to null when empty. */
export function normalizeProfilePayload(data: UpdateProfileInput) {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    birthYear: data.birthYear ?? null,
    phone: data.phone ?? null,
    street: trimOrNull(data.street),
    city: trimOrNull(data.city),
    state: trimOrNull(data.state),
    zip: trimOrNull(data.zip),
    displayName: `${data.firstName} ${data.lastName}`.trim(),
  };
}
