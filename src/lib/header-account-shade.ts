import type { PlatformRole } from "@/types";

export type HeaderAccountShade = "admin" | "organizer" | "judge" | "registrant";

export const HEADER_ACCOUNT_SHADE_LABEL: Record<HeaderAccountShade, string> = {
  admin: "Admin",
  organizer: "Organizer",
  judge: "Judge",
  registrant: "Registrant",
};

/** Logout button tint so testers can see which account type is signed in. */
export const HEADER_LOGOUT_BUTTON_CLASS: Record<HeaderAccountShade, string> = {
  registrant:
    "bg-sky-100 text-sky-900 hover:bg-sky-200 dark:bg-sky-950/80 dark:text-sky-100 dark:hover:bg-sky-900",
  judge:
    "bg-amber-100 text-amber-950 hover:bg-amber-200 dark:bg-amber-950/80 dark:text-amber-100 dark:hover:bg-amber-900",
  organizer:
    "bg-emerald-100 text-emerald-950 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-100 dark:hover:bg-emerald-900",
  admin:
    "bg-pink-100 text-pink-950 hover:bg-pink-200 dark:bg-pink-950/80 dark:text-pink-100 dark:hover:bg-pink-900",
};

export function resolveHeaderAccountShade(input: {
  platformRole?: PlatformRole;
  hasJudgeStaffRole?: boolean;
}): HeaderAccountShade {
  if (input.platformRole === "ADMIN") return "admin";
  if (input.platformRole === "ORGANIZER") return "organizer";
  if (input.hasJudgeStaffRole) return "judge";
  return "registrant";
}
