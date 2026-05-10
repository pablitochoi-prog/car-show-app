import { prisma } from "@/lib/db";

const SETTING_KEY = "default_staff_roles";

type DefaultRole = { slug: string; name: string; sortOrder: number };

const DEFAULTS: DefaultRole[] = [
  { slug: "organizer", name: "Organizer", sortOrder: 0 },
  { slug: "treasurer", name: "Treasurer", sortOrder: 1 },
  { slug: "registrar", name: "Registrar", sortOrder: 2 },
  { slug: "judge", name: "Judge", sortOrder: 3 },
  { slug: "marketing", name: "Marketing", sortOrder: 4 },
  { slug: "volunteer", name: "Volunteer", sortOrder: 5 },
];

async function loadRoles(): Promise<DefaultRole[]> {
  const row = await prisma.globalSetting.findUnique({ where: { key: SETTING_KEY } });
  if (!row) return [...DEFAULTS];
  return row.value as DefaultRole[];
}

async function saveRoles(roles: DefaultRole[]): Promise<void> {
  const json = JSON.parse(JSON.stringify(roles));
  await prisma.globalSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: json },
    create: { key: SETTING_KEY, value: json },
  });
}

export async function getDefaultRoleTemplate(): Promise<DefaultRole[]> {
  const roles = await loadRoles();
  return [...roles].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function addDefaultRole(
  name: string,
  slug: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required" };

  const roles = await loadRoles();
  const s = slug ?? trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/_+$/, "");
  if (roles.some((r) => r.slug === s))
    return { ok: false, error: `A role with slug "${s}" already exists.` };
  if (roles.some((r) => r.name.toLowerCase() === trimmed.toLowerCase()))
    return { ok: false, error: `A role named "${trimmed}" already exists.` };

  const maxSort = roles.reduce((m, r) => Math.max(m, r.sortOrder), 0);
  roles.push({ slug: s, name: trimmed, sortOrder: maxSort + 1 });
  await saveRoles(roles);
  return { ok: true };
}

export async function updateDefaultRole(
  slug: string,
  newName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const roles = await loadRoles();
  const idx = roles.findIndex((r) => r.slug === slug);
  if (idx === -1) return { ok: false, error: "Role not found" };
  if (newName) {
    if (roles.some((r, i) => i !== idx && r.name.toLowerCase() === newName.toLowerCase()))
      return { ok: false, error: `A role named "${newName}" already exists.` };
    roles[idx] = { ...roles[idx], name: newName };
  }
  await saveRoles(roles);
  return { ok: true };
}

export async function removeDefaultRole(slug: string): Promise<void> {
  const roles = await loadRoles();
  await saveRoles(roles.filter((r) => r.slug !== slug));
}

export async function reorderDefaultRoles(orderedSlugs: string[]): Promise<void> {
  const roles = await loadRoles();
  const bySlug = new Map(roles.map((r) => [r.slug, r]));
  const reordered: DefaultRole[] = [];
  orderedSlugs.forEach((slug, i) => {
    const role = bySlug.get(slug);
    if (role) reordered.push({ ...role, sortOrder: i });
  });
  roles.forEach((r) => {
    if (!orderedSlugs.includes(r.slug)) reordered.push(r);
  });
  await saveRoles(reordered);
}
