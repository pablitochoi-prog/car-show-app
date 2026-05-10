import { z } from "zod";

/** Masked US phone: (###) ###-#### — optional empty */
export const staffPhoneMaskedSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\(\d{3}\) \d{3}-\d{4}$/.test(v), {
    message: "Phone must match (555) 555-5555",
  });

/** Exactly 10 digits after normalization — optional */
export const staffPhoneDigitsSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{10}$/.test(v), {
    message: "Phone must be 10 digits",
  });

export const customRoleNameSchema = z
  .string()
  .trim()
  .min(1, "Role name is required")
  .max(50, "Role name must be at most 50 characters");

export const postEventStaffBodySchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  firstName: z.string().trim().max(80).optional().default(""),
  lastName: z.string().trim().max(80).optional().default(""),
  phone: staffPhoneMaskedSchema.optional().default(""),
  roleIds: z.array(z.string().uuid()).min(1, "Select at least one role"),
});

export const patchEventStaffBodySchema = z.object({
  userId: z.string().uuid(),
  firstName: z.string().trim().max(80).optional().default(""),
  lastName: z.string().trim().max(80).optional().default(""),
  phone: staffPhoneMaskedSchema.optional().default(""),
  roleIds: z.array(z.string().uuid()).min(1, "Select at least one role"),
});

export const postCustomRoleBodySchema = z.object({
  name: customRoleNameSchema,
});

export type PostEventStaffBody = z.infer<typeof postEventStaffBodySchema>;
export type PatchEventStaffBody = z.infer<typeof patchEventStaffBodySchema>;
export type PostCustomRoleBody = z.infer<typeof postCustomRoleBodySchema>;
