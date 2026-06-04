import { prisma } from "@/lib/db";
import type { EventRole } from "@/types";
import { formatUSPhoneDigits } from "@/lib/phone-us";
import {
  getDefaultRoleTemplate,
  mergeWithBuiltinDefaultStaffRoles,
} from "@/lib/admin-staff-roles";

async function getDefaultRoleSeed() {
  const templates = mergeWithBuiltinDefaultStaffRoles(await getDefaultRoleTemplate());
  return templates.map((r) => ({
    slug: r.slug,
    name: r.name,
    sortOrder: r.sortOrder,
  }));
}

/** Ensures built-in roles (including Head Judge) exist on this event. */
export async function syncBuiltinEventStaffRoles(eventId: string): Promise<void> {
  await ensureDefaultEventRoles(eventId);
}

/** Map default slug → legacy permission enum used across the app. Custom roles omit. */
export function slugToPermissionRole(slug: string | null): EventRole | undefined {
  if (!slug) return undefined;
  const m: Record<string, EventRole> = {
    organizer: "ORGANIZER",
    treasurer: "TREASURER",
    registrar: "REGISTRAR",
    judge: "JUDGE",
    special_judge: "SPECIAL_JUDGE",
    head_judge: "HEAD_JUDGE",
    marketing: "MARKETING",
    volunteer: "VOLUNTEER",
  };
  return m[slug];
}

export function storedDigitsToMasked(phone: string | null | undefined): string {
  if (!phone?.trim()) return "";
  return formatUSPhoneDigits(phone.replace(/\D/g, "").slice(0, 10));
}

/**
 * All permission-granting event roles (default slugs only). Custom role names are ignored.
 */
export async function getUserEventRoles(
  userId: string,
  eventId: string,
): Promise<EventRole[]> {
  const links = await prisma.eventStaffRoleLink.findMany({
    where: { staffMember: { userId, eventId } },
    include: { role: { select: { slug: true } } },
  });
  const out: EventRole[] = [];
  for (const l of links) {
    const p = slugToPermissionRole(l.role.slug);
    if (p) out.push(p);
  }
  return out;
}

export type StaffMember = {
  userId: string;
  name: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  phoneDisplay: string;
  roles: { id: string; name: string; slug: string | null; sortOrder: number }[];
};

export async function ensureDefaultEventRoles(eventId: string): Promise<void> {
  const n = await prisma.eventRoleDefinition.count({ where: { eventId } });
  if (n === 0) {
    await prisma.eventRoleDefinition.createMany({
      data: (await getDefaultRoleSeed()).map((r) => ({
        eventId,
        slug: r.slug,
        name: r.name,
        isDefault: true,
        sortOrder: r.sortOrder,
      })),
    });
    return;
  }

  const seed = await getDefaultRoleSeed();
  const existing = await prisma.eventRoleDefinition.findMany({
    where: { eventId, slug: { not: null } },
    select: { slug: true },
  });
  const have = new Set(existing.map((r) => r.slug));
  const missing = seed.filter((r) => !have.has(r.slug));
  for (const r of missing) {
    await prisma.eventRoleDefinition.upsert({
      where: { eventId_slug: { eventId, slug: r.slug } },
      create: {
        eventId,
        slug: r.slug,
        name: r.name,
        isDefault: true,
        sortOrder: r.sortOrder,
      },
      update: {
        name: r.name,
        isDefault: true,
        sortOrder: r.sortOrder,
      },
    });
  }
}

export async function listEventRoleDefinitions(eventId: string) {
  await ensureDefaultEventRoles(eventId);
  return prisma.eventRoleDefinition.findMany({
    where: { eventId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, isDefault: true, sortOrder: true },
  });
}

/** Grouped staff list for the event UI */
export async function getEventStaffList(eventId: string): Promise<StaffMember[]> {
  await ensureDefaultEventRoles(eventId);

  const members = await prisma.eventStaffMember.findMany({
    where: { eventId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      roleLinks: {
        include: {
          role: {
            select: { id: true, name: true, slug: true, sortOrder: true },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    firstName: m.user.firstName,
    lastName: m.user.lastName,
    phone: m.user.phone,
    phoneDisplay: storedDigitsToMasked(m.user.phone),
    roles: m.roleLinks
      .map((l) => l.role)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
  }));
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, name: true, email: true },
  });
}

export async function updateUserStaffContact(
  userId: string,
  data: {
    firstName?: string | null;
    lastName?: string | null;
    phoneDigits?: string | null;
  },
) {
  const firstName = data.firstName?.trim() || null;
  const lastName = data.lastName?.trim() || null;
  const phone =
    data.phoneDigits && data.phoneDigits.length === 10 ? data.phoneDigits : null;

  const display =
    [firstName, lastName].filter(Boolean).join(" ").trim() || undefined;

  await prisma.user.update({
    where: { id: userId },
    data: {
      firstName,
      lastName,
      phone,
      ...(display ? { name: display } : {}),
    },
  });
}

async function setRoleLinksForMember(staffMemberId: string, roleIds: string[]) {
  const unique = [...new Set(roleIds)];
  await prisma.$transaction(async (tx) => {
    await tx.eventStaffRoleLink.deleteMany({ where: { staffMemberId } });
    await tx.eventStaffRoleLink.createMany({
      data: unique.map((roleId) => ({ staffMemberId, roleId })),
    });
  });
}

/** Upsert membership and assign roles (used when adding staff). */
export async function upsertStaffMemberWithRoles(
  eventId: string,
  userId: string,
  roleIds: string[],
) {
  const member = await prisma.eventStaffMember.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: { eventId, userId },
    update: {},
    select: { id: true },
  });
  await setRoleLinksForMember(member.id, roleIds);
}

/** After removing Organizer, fall back to Volunteer instead of dropping staff. */
function roleIdsAfterStrippingOrganizer(
  roleIds: string[],
  organizerRoleId: string,
  volunteerRoleId: string | null,
): { next: string[]; deleteMember: boolean } {
  const without = roleIds.filter((id) => id !== organizerRoleId);
  if (without.length === roleIds.length) {
    return { next: roleIds, deleteMember: false };
  }
  if (without.length > 0) {
    return { next: [...new Set(without)], deleteMember: false };
  }
  if (volunteerRoleId) {
    return { next: [volunteerRoleId], deleteMember: false };
  }
  return { next: [], deleteMember: true };
}

/**
 * Ensure only `keeperUserId` has the Organizer role. Everyone else loses it;
 * if they only had Organizer they become Volunteer (if defined).
 */
export async function ensureOnlyOneEventOrganizer(
  eventId: string,
  keeperUserId: string,
): Promise<void> {
  await ensureDefaultEventRoles(eventId);
  const organizerRole = await prisma.eventRoleDefinition.findFirst({
    where: { eventId, slug: "organizer" },
    select: { id: true },
  });
  if (!organizerRole) return;
  const volunteerRole = await prisma.eventRoleDefinition.findFirst({
    where: { eventId, slug: "volunteer" },
    select: { id: true },
  });
  const organizerRoleId = organizerRole.id;
  const volunteerRoleId = volunteerRole?.id ?? null;

  const members = await prisma.eventStaffMember.findMany({
    where: { eventId },
    include: { roleLinks: { select: { roleId: true } } },
  });

  await prisma.$transaction(async (tx) => {
    for (const m of members) {
      if (m.userId === keeperUserId) continue;
      const roleIds = m.roleLinks.map((l) => l.roleId);
      if (!roleIds.includes(organizerRoleId)) continue;
      const { next, deleteMember } = roleIdsAfterStrippingOrganizer(
        roleIds,
        organizerRoleId,
        volunteerRoleId,
      );
      if (deleteMember) {
        await tx.eventStaffMember.delete({ where: { id: m.id } });
      } else {
        await tx.eventStaffRoleLink.deleteMany({ where: { staffMemberId: m.id } });
        await tx.eventStaffRoleLink.createMany({
          data: next.map((roleId) => ({
            staffMemberId: m.id,
            roleId,
          })),
        });
      }
    }
  });
}

/**
 * Make `newOrganizerUserId` the only user with the default “organizer” role.
 * Others lose organizer; former organizers with no other roles become **Volunteer**.
 * New user is on staff with organizer plus any roles they already held.
 */
export async function transferEventOrganizerRole(
  eventId: string,
  newOrganizerUserId: string,
): Promise<void> {
  await ensureDefaultEventRoles(eventId);
  const organizerRole = await prisma.eventRoleDefinition.findFirst({
    where: { eventId, slug: "organizer" },
    select: { id: true },
  });
  if (!organizerRole) {
    throw new Error("This event has no organizer role.");
  }
  const volunteerRole = await prisma.eventRoleDefinition.findFirst({
    where: { eventId, slug: "volunteer" },
    select: { id: true },
  });
  const organizerRoleId = organizerRole.id;
  const volunteerRoleId = volunteerRole?.id ?? null;

  const members = await prisma.eventStaffMember.findMany({
    where: { eventId },
    include: { roleLinks: { select: { roleId: true } } },
  });

  const priorNewOwnerRoles =
    members.find((m) => m.userId === newOrganizerUserId)?.roleLinks.map((l) => l.roleId) ??
    [];
  const mergedForNewOwner = [...new Set([...priorNewOwnerRoles, organizerRoleId])];

  await prisma.$transaction(async (tx) => {
    for (const m of members) {
      if (m.userId === newOrganizerUserId) continue;
      const roleIds = m.roleLinks.map((l) => l.roleId);
      if (!roleIds.includes(organizerRoleId)) continue;
      const { next, deleteMember } = roleIdsAfterStrippingOrganizer(
        roleIds,
        organizerRoleId,
        volunteerRoleId,
      );
      if (deleteMember) {
        await tx.eventStaffMember.delete({ where: { id: m.id } });
      } else {
        await tx.eventStaffRoleLink.deleteMany({ where: { staffMemberId: m.id } });
        await tx.eventStaffRoleLink.createMany({
          data: next.map((roleId) => ({
            staffMemberId: m.id,
            roleId,
          })),
        });
      }
    }

    const staffRow = await tx.eventStaffMember.upsert({
      where: { eventId_userId: { eventId, userId: newOrganizerUserId } },
      create: { eventId, userId: newOrganizerUserId },
      update: {},
      select: { id: true },
    });
    await tx.eventStaffRoleLink.deleteMany({ where: { staffMemberId: staffRow.id } });
    await tx.eventStaffRoleLink.createMany({
      data: mergedForNewOwner.map((roleId) => ({
        staffMemberId: staffRow.id,
        roleId,
      })),
    });
  });
}

export async function removeStaffMember(eventId: string, userId: string) {
  await prisma.eventStaffMember.deleteMany({ where: { eventId, userId } });
}

/** Validate all roleIds belong to this event */
export async function assertRoleIdsBelongToEvent(
  eventId: string,
  roleIds: string[],
): Promise<boolean> {
  if (roleIds.length === 0) return false;
  const count = await prisma.eventRoleDefinition.count({
    where: { eventId, id: { in: [...new Set(roleIds)] } },
  });
  return count === new Set(roleIds).size;
}

/** True if the user has the default “Organizer” role on this event (manage staff, etc.). */
export async function userHasOrganizerStaffRole(
  userId: string,
  eventId: string,
): Promise<boolean> {
  const n = await prisma.eventStaffRoleLink.count({
    where: {
      staffMember: { userId, eventId },
      role: { slug: "organizer" },
    },
  });
  return n > 0;
}

/** True if the user has the default “Head Judge” role on this event. */
export async function userHasHeadJudgeStaffRole(
  userId: string,
  eventId: string,
): Promise<boolean> {
  const n = await prisma.eventStaffRoleLink.count({
    where: {
      staffMember: { userId, eventId },
      role: { slug: "head_judge" },
    },
  });
  return n > 0;
}

/** Display names for users with the “organizer” staff role (registrant message recipients). */
export async function getEventOrganizerDisplayNames(
  eventId: string,
): Promise<string[]> {
  await ensureDefaultEventRoles(eventId);
  const members = await prisma.eventStaffMember.findMany({
    where: {
      eventId,
      roleLinks: { some: { role: { slug: "organizer" } } },
    },
    include: {
      user: {
        select: { name: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return members.map((m) => {
    const u = m.user;
    const n = u.name?.trim();
    if (n) return n;
    const fromParts = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
    return fromParts || "Event organizer";
  });
}

/** Public copy for the event page explaining who receives contact messages. */
export function formatOrganizerMessageRecipientNote(names: string[]): string | null {
  if (names.length === 0) return null;
  const list = new Intl.ListFormat("en", {
    style: "long",
    type: "conjunction",
  }).format(names);
  return `Questions about this event and refund requests are sent to ${list}.`;
}

export async function createCustomEventRole(eventId: string, name: string) {
  await ensureDefaultEventRoles(eventId);
  const trimmed = name.trim();
  const maxSort =
    (
      await prisma.eventRoleDefinition.aggregate({
        where: { eventId },
        _max: { sortOrder: true },
      })
    )._max.sortOrder ?? 0;

  return prisma.eventRoleDefinition.create({
    data: {
      eventId,
      slug: null,
      name: trimmed,
      isDefault: false,
      sortOrder: maxSort + 1,
    },
    select: { id: true, name: true, slug: true, isDefault: true, sortOrder: true },
  });
}
