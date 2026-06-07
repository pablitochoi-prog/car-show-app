/** Next available slug when keeping a duplicate copy of an existing article. */
export function nextAvailableKnowledgeSlug(
  base: string,
  takenSlugs: Set<string>,
): string {
  const suffix = "-copy";
  let slug = base.endsWith(suffix) ? `${base}-2` : `${base}${suffix}`;
  let attempt = 2;
  while (takenSlugs.has(slug)) {
    slug = `${base}-copy-${attempt}`;
    attempt += 1;
  }
  return slug;
}
