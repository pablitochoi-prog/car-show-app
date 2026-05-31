import { z } from "zod";
import { updateProfileSchema } from "@/lib/validation/profile";

const adminEmailSchema = z
  .string()
  .email("Please enter a valid email address.")
  .transform((s) => s.trim().toLowerCase());

const VALID_ROLES = ["USER", "ORGANIZER", "ADMIN"] as const;
const VALID_STATUSES = ["ACTIVE", "SUSPENDED", "BANNED"] as const;

const optionalName = z
  .string()
  .min(1, "Name cannot be empty")
  .max(80)
  .transform((s) => s.trim())
  .optional();

/** Admin can update any subset of account fields for troubleshooting. */
export const adminAccountUpdateSchema = z
  .object({
    id: z.string().uuid("Invalid user id"),
    firstName: optionalName,
    lastName: optionalName,
    email: adminEmailSchema.optional(),
    birthYear: z
      .union([
        z.number().int().min(1900).max(new Date().getFullYear()),
        z.null(),
      ])
      .optional(),
    phone: updateProfileSchema.shape.phone,
    street: updateProfileSchema.shape.street,
    city: updateProfileSchema.shape.city,
    state: updateProfileSchema.shape.state,
    zip: updateProfileSchema.shape.zip,
    platformRole: z.enum(VALID_ROLES).optional(),
    status: z.enum(VALID_STATUSES).optional(),
    statusReason: z.string().max(500).nullable().optional(),
    archive: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.firstName !== undefined ||
      data.lastName !== undefined ||
      data.email !== undefined ||
      data.phone !== undefined ||
      data.birthYear !== undefined ||
      data.street !== undefined ||
      data.city !== undefined ||
      data.state !== undefined ||
      data.zip !== undefined ||
      data.platformRole !== undefined ||
      data.status !== undefined ||
      data.statusReason !== undefined ||
      data.archive !== undefined,
    { message: "No fields to update" },
  );

export type AdminAccountUpdateInput = z.infer<typeof adminAccountUpdateSchema>;

export { VALID_ROLES, VALID_STATUSES };
export { normalizeProfilePayload } from "@/lib/validation/profile";
