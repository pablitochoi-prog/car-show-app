import { z } from "zod";

/** Shown in the signup mismatch dialog and returned from the API when confirm fails validation. */
export const SIGNUP_PASSWORD_MISMATCH_MESSAGE =
  "Your Password and Confirm Password entries do not match. Please re-enter.";

export const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one capital letter")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character"
  );

const usernameField = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Username can only use letters, numbers, and underscores"
  )
  .transform((s) => s.trim().toLowerCase());

export const signupSchema = z
  .object({
    username: usernameField,
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
    email: z
      .string()
      .email("Please enter a valid email address")
      .transform((s) => s.trim().toLowerCase()),
    password: passwordField,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    phone: z
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
      ),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: SIGNUP_PASSWORD_MISMATCH_MESSAGE,
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const updatePasswordSchema = z
  .object({
    password: passwordField,
    confirm: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirm, {
    message: SIGNUP_PASSWORD_MISMATCH_MESSAGE,
    path: ["confirm"],
  });

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
