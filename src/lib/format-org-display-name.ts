/**
 * Label for club name + optional US postal state from org profile,
 * e.g. `"PCA New Jersey (NJ)"`.
 */
export function formatOrgNameWithClubState(
  name: string,
  clubState: string | null | undefined
): string {
  const st = clubState?.trim();
  return st ? `${name} (${st})` : name;
}
