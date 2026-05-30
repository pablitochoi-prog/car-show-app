/** Format mailing address for dash cards and display (single line). */
export function formatRegistrationMailingAddress(parts: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string {
  const street = parts.street?.trim() ?? "";
  const city = parts.city?.trim() ?? "";
  const state = parts.state?.trim().toUpperCase() ?? "";
  const zip = parts.zip?.trim() ?? "";
  const cityStateZip = [city, [state, zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return [street, cityStateZip].filter(Boolean).join(", ");
}

/** City + ST for dash cards and compact display. */
export function formatOwnerCityState(parts: {
  city?: string | null;
  state?: string | null;
}): string {
  const city = parts.city?.trim() ?? "";
  const state = parts.state?.trim().toUpperCase() ?? "";
  return [city, state].filter(Boolean).join(", ");
}

export function hasCompleteMailingAddress(parts: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): boolean {
  return (
    (parts.city?.trim().length ?? 0) > 0 &&
    (parts.state?.trim().length ?? 0) >= 2 &&
    (parts.zip?.trim().length ?? 0) >= 5
  );
}
