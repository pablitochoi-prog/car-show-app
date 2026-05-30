import { z } from "zod";

export const registrationTierWriteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  priceCents: z.coerce.number().int().min(0),
  opensAt: z.union([z.string(), z.null()]).optional(),
  closesAt: z.union([z.string(), z.null()]).optional(),
  memberOnly: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

const optionalVehicleNickname = z.preprocess((val) => {
  if (val === undefined || val === null) return undefined;
  const t = String(val).trim();
  return t === "" ? undefined : t;
}, z.string().max(48, "Nickname must be at most 48 characters").optional());

const optionalVehicleVin = z.preprocess((val) => {
  if (val === undefined || val === null) return undefined;
  const t = String(val).trim().toUpperCase().replace(/\s+/g, "");
  return t === "" ? undefined : t;
}, z.string().max(17, "VIN must be at most 17 characters").optional());

/** Optional image URL; `null` clears the photo on PATCH. */
const optionalVehiclePhotoUrl = z.preprocess((val) => {
  if (val === undefined) return undefined;
  if (val === null) return null;
  const t = String(val).trim();
  return t === "" ? undefined : t;
}, z.union([z.null(), z.string().url("Invalid photo URL").max(2000)]).optional());

export const vehicleWriteSchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(1885)
    .max(new Date().getFullYear() + 2),
  make: z.string().min(1, "Make is required").max(100),
  model: z.string().min(1, "Model is required").max(100),
  trim: z.string().optional(),
  nickname: optionalVehicleNickname,
  vin: optionalVehicleVin,
  photoUrl: optionalVehiclePhotoUrl,
  notes: z.string().optional(),
});

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
    "Enter a complete 10-digit phone number or leave this field blank.",
  )
  .transform((d) =>
    d === undefined
      ? undefined
      : `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`,
  );

const optionalRegistrationStreet = z.preprocess(
  (val) => (val == null ? "" : String(val).trim()),
  z.string().max(200),
);

const registrationAddressSchema = z.object({
  street: optionalRegistrationStreet,
  city: z.string().min(1, "City is required").max(100),
  state: z
    .string()
    .min(2, "State is required")
    .max(2, "Use 2-letter state code")
    .transform((s) => s.toUpperCase()),
  zip: z
    .string()
    .min(5, "Zip code is required")
    .max(10, "Zip code is too long")
    .regex(/^\d{5}(-\d{4})?$/, "Enter a valid US zip code"),
});

export const registrationContactSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(100),
    lastName: z.string().min(1, "Last name is required").max(100),
    email: z.string().email("Valid email is required"),
    phone: z.string().max(30).optional(),
  })
  .merge(registrationAddressSchema);

export const registerForEventSchema = z
  .object({
    tierId: z.string().uuid(),
    contact: registrationContactSchema,
    vehicleIds: z.array(z.string().uuid()).default([]),
    newVehicles: z.array(vehicleWriteSchema).optional(),
    vehicleCategories: z.record(z.string().uuid(), z.string().uuid()).optional(),
    /** Per-vehicle nickname saved to the garage vehicle at registration time. */
    vehicleNicknames: z
      .record(z.string().uuid(), optionalVehicleNickname)
      .optional(),
    /** Donation amount in cents when event fee type is DONATION. */
    donationCents: z.coerce.number().int().min(0).optional(),
  })
  .refine(
    (d) =>
      (d.vehicleIds?.length ?? 0) > 0 || (d.newVehicles?.length ?? 0) > 0,
    "Select at least one vehicle or add a new one"
  );

const guestVehicleSchema = z.object({
  year: z.coerce.number().int().min(1885).max(new Date().getFullYear() + 2),
  make: z.string().min(1, "Make is required").max(100),
  model: z.string().min(1, "Model is required").max(100),
  trim: z.string().optional(),
  nickname: optionalVehicleNickname,
  notes: z.string().optional(),
  photoUrl: optionalVehiclePhotoUrl,
  eventCategoryId: z.string().uuid().optional(),
});

export const guestRegisterSchema = z
  .object({
    tierId: z.string().uuid(),
    firstName: z.string().min(1, "First name is required").max(100),
    lastName: z.string().min(1, "Last name is required").max(100),
    email: z.string().email("Valid email is required"),
    phone: optionalMaskedUsPhone,
    vehicles: z
      .array(guestVehicleSchema)
      .min(1, "Add at least one vehicle"),
    donationCents: z.coerce.number().int().min(0).optional(),
  })
  .merge(registrationAddressSchema);

const guestVehicleOrganizerUpdateSchema = z.object({
  publicVehicleId: z.string().min(1, "Vehicle id is required"),
  nickname: optionalVehicleNickname,
  eventCategoryId: z.union([z.string().uuid(), z.null()]).optional(),
  notes: z.string().max(5000).optional(),
});

/** Organizer updates guest contact (and optional vehicle fields) before payment completes. */
export const organizerUpdateGuestRegistrationSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z
    .string()
    .email("Valid email is required")
    .transform((s) => s.trim().toLowerCase()),
  phone: optionalMaskedUsPhone,
  street: optionalRegistrationStreet,
  city: z.string().min(1, "City is required").max(100),
  state: z
    .string()
    .min(2, "State is required")
    .max(2, "Use 2-letter state code")
    .transform((s) => s.toUpperCase()),
  zip: z
    .string()
    .min(5, "Zip code is required")
    .max(10, "Zip code is too long")
    .regex(/^\d{5}(-\d{4})?$/, "Enter a valid US zip code"),
  vehicles: z.array(guestVehicleOrganizerUpdateSchema).optional(),
});
