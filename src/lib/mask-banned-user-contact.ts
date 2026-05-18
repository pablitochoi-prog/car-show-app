const HIDDEN = "Contact hidden";

/** Hide email/phone for banned users shown to organizers. */
export function maskContactIfBanned(
  status: string | null | undefined,
  value: string | null | undefined,
): string {
  if (status === "BANNED") return HIDDEN;
  return value?.trim() || "";
}
