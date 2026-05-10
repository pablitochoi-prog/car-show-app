import { prisma } from "@/lib/db";

const SETTING_KEY = "tier_templates";

type TierTemplate = { slug: string; name: string; sortOrder: number };

const DEFAULTS: TierTemplate[] = [
  { slug: "general_admission", name: "General Admission", sortOrder: 0 },
  { slug: "early_bird", name: "Early Bird", sortOrder: 1 },
  { slug: "vip", name: "VIP", sortOrder: 2 },
  { slug: "day_of", name: "Day-of Registration", sortOrder: 3 },
];

function toSlug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/_+$/, "");
}

async function loadTemplates(): Promise<TierTemplate[]> {
  const row = await prisma.globalSetting.findUnique({ where: { key: SETTING_KEY } });
  if (!row) return [...DEFAULTS];
  return row.value as TierTemplate[];
}

async function saveTemplates(templates: TierTemplate[]): Promise<void> {
  const json = JSON.parse(JSON.stringify(templates));
  await prisma.globalSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: json },
    create: { key: SETTING_KEY, value: json },
  });
}

export async function getTierTemplates(): Promise<TierTemplate[]> {
  const templates = await loadTemplates();
  return [...templates].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function addTierTemplate(
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required" };
  if (trimmed.length > 60) return { ok: false, error: "Name too long (max 60)" };

  const templates = await loadTemplates();
  const slug = toSlug(trimmed);
  if (templates.some((t) => t.slug === slug))
    return { ok: false, error: `"${trimmed}" already exists.` };
  if (templates.some((t) => t.name.toLowerCase() === trimmed.toLowerCase()))
    return { ok: false, error: `"${trimmed}" already exists.` };

  const maxSort = templates.reduce((m, t) => Math.max(m, t.sortOrder), -1);
  templates.push({ slug, name: trimmed, sortOrder: maxSort + 1 });
  await saveTemplates(templates);
  return { ok: true };
}

export async function renameTierTemplate(
  slug: string,
  newName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const templates = await loadTemplates();
  const idx = templates.findIndex((t) => t.slug === slug);
  if (idx === -1) return { ok: false, error: "Template not found" };
  const trimmed = newName.trim();
  if (!trimmed) return { ok: false, error: "Name is required" };
  if (templates.some((t, i) => i !== idx && t.name.toLowerCase() === trimmed.toLowerCase()))
    return { ok: false, error: `"${trimmed}" already exists.` };
  templates[idx] = { ...templates[idx], name: trimmed };
  await saveTemplates(templates);
  return { ok: true };
}

export async function removeTierTemplate(slug: string): Promise<void> {
  const templates = await loadTemplates();
  await saveTemplates(templates.filter((t) => t.slug !== slug));
}

export async function reorderTierTemplates(orderedSlugs: string[]): Promise<void> {
  const templates = await loadTemplates();
  const bySlug = new Map(templates.map((t) => [t.slug, t]));
  const reordered: TierTemplate[] = [];
  orderedSlugs.forEach((slug, i) => {
    const tpl = bySlug.get(slug);
    if (tpl) reordered.push({ ...tpl, sortOrder: i });
  });
  templates.forEach((t) => {
    if (!orderedSlugs.includes(t.slug)) reordered.push(t);
  });
  await saveTemplates(reordered);
}
