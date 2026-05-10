import { prisma } from "@/lib/db";
import type { EventRole } from "@/types";
import { formatUSPhoneDigits } from "@/lib/phone-us";
import { getDefaultRoleTemplate } from "@/lib/admin-staff-roles";

async function getDefaultRoleSeed() {
  const templates = await getDefaultRoleTemplate();
  return templates.map((r) => ({
    slug: r.slug,
    name: r.name,
    sortOrder: r.sortOrder,
  }));
}

/** Map default slug → legacy permission enum used across the app. Custom roles omit. */
export function slugToPermissionRole(slug: string | null): EventRole | undefined {
  if (!slug) return undefined;
  const m: Record<string, EventRole> = {
    organizer: "ORGANIZER",
    treasurer: "TREASURER",
    registrar: "REGISTRAR",
    judge: "JUDGE",
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
  if (n > 0) return;

  await prisma.eventRoleDefinition.createMany({
    data: (await getDefaultRoleSeed()).map((r) => ({
      eventId,
      slug: r.slug,
      name: r.name,
      isDefault: true,
      sortOrder: r.sortOrder,
    })),
  });
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
