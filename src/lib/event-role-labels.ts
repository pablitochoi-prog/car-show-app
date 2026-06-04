import type { EventRole } from "@/types";

/** Preferred display order for permission roles (workflow-ish). */
const ROLE_DISPLAY_ORDER: EventRole[] = [
  "ORGANIZER",
  "REGISTRAR",
  "JUDGE",
  "SPECIAL_JUDGE",
  "HEAD_JUDGE",
  "TREASURER",
  "MARKETING",
  "VOLUNTEER",
];

export const EVENT_ROLE_LABEL: Record<EventRole, string> = {
  ORGANIZER: "Organizer",
  REGISTRAR: "Registrar",
  JUDGE: "Judge",
  SPECIAL_JUDGE: "Special Judge",
  HEAD_JUDGE: "Head Judge",
  TREASURER: "Treasurer",
  MARKETING: "Marketing",
  VOLUNTEER: "Volunteer",
};

export function sortRolesForDisplay(roles: EventRole[]): EventRole[] {
  const rank = (r: EventRole) => {
    const i = ROLE_DISPLAY_ORDER.indexOf(r);
    return i === -1 ? 999 : i;
  };
  return [...new Set(roles)].sort((a, b) => rank(a) - rank(b));
}

function staffRoleSlugRank(slug: string | null) {
  if (!slug) return 100;
  const order = [
    "organizer",
    "registrar",
    "judge",
    "special_judge",
    "head_judge",
    "treasurer",
    "marketing",
    "volunteer",
  ];
  const i = order.indexOf(slug);
  return i === -1 ? 50 : i;
}

/** Sort dashboard role badges: organizer-like defaults first, then alphabetically by label */
export function sortStaffRoleBadgesForDisplay(
  roles: { slug: string | null; name: string }[],
): { slug: string | null; name: string }[] {
  return [...roles].sort((a, b) => {
    const dr = staffRoleSlugRank(a.slug) - staffRoleSlugRank(b.slug);
    if (dr !== 0) return dr;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export type StaffRoleBadgeRow = {
  id: string;
  slug: string | null;
  name: string;
};

/** Same ordering as `sortStaffRoleBadgesForDisplay`, preserves stable `id` for keys. */
export function sortStaffRoleBadgeRowsForDisplay(
  roles: StaffRoleBadgeRow[],
): StaffRoleBadgeRow[] {
  return [...roles].sort((a, b) => {
    const dr = staffRoleSlugRank(a.slug) - staffRoleSlugRank(b.slug);
    if (dr !== 0) return dr;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}
