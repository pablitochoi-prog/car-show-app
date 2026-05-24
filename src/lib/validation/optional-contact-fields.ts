import { z } from "zod";
import { CONTACT_EMAIL_INVALID_MESSAGE } from "@/lib/email-contact";
import { normalizeWebsiteUrlForStorage } from "@/lib/website-url";

export function optionalWebsiteField() {
  return z.preprocess(
    (v) =>
      v === null || v === undefined
        ? undefined
        : String(v).trim() === ""
          ? ""
          : String(v).trim(),
    z
      .string()
      .optional()
      .refine(
        (s) =>
          s === undefined ||
          s === "" ||
          normalizeWebsiteUrlForStorage(s) !== undefined,
        { message: "Enter a valid website URL (e.g. example.com)" },
      )
      .transform((s) => {
        if (s === undefined || s === "") return s === "" ? "" : undefined;
        return normalizeWebsiteUrlForStorage(s);
      }),
  );
}

export function optionalEmailField() {
  return z.preprocess(
    (v) => (v === null || v === undefined ? undefined : String(v)),
    z
      .union([
        z.literal(""),
        z
          .string()
          .min(1)
          .refine(
            (s) => s.trim().length === 0 || (s.includes("@") && s.includes(".")),
            CONTACT_EMAIL_INVALID_MESSAGE,
          ),
      ])
      .optional()
      .transform((s) => {
        if (s === undefined) return undefined;
        return s.trim();
      }),
  );
}
