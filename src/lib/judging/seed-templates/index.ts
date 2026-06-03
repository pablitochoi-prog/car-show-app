import { AACA_AUTOMOBILE_TEMPLATE } from "@/lib/judging/seed-templates/aaca-automobile-template";
import { LEGACY_GLOBAL_TEMPLATES } from "@/lib/judging/seed-templates/legacy-judging-templates";
import { MCA_1968_1972_EXTERIOR_TEMPLATE } from "@/lib/judging/seed-templates/mca-1968-1972-exterior-template";
import { NCRS_1968_1972_EXTERIOR_TEMPLATE } from "@/lib/judging/seed-templates/ncrs-1968-1972-exterior-template";
import { PCA_ZONE8_TEMPLATE } from "@/lib/judging/seed-templates/pca-zone8-template";

export type { GlobalTemplateSeed } from "@/lib/judging/seed-templates/judging-template-types";
export {
  globalTemplateSeedToScorecardInput,
} from "@/lib/judging/seed-templates/judging-template-types";

/** Predefined scorecard starter templates (Phase 5C). */
export const SCORECARD_STARTER_TEMPLATES = [
  PCA_ZONE8_TEMPLATE,
  NCRS_1968_1972_EXTERIOR_TEMPLATE,
  MCA_1968_1972_EXTERIOR_TEMPLATE,
  AACA_AUTOMOBILE_TEMPLATE,
];

export const ALL_GLOBAL_JUDGING_TEMPLATE_SEEDS = [
  ...SCORECARD_STARTER_TEMPLATES,
  ...LEGACY_GLOBAL_TEMPLATES,
];

export function countTemplateNodes(seed: (typeof SCORECARD_STARTER_TEMPLATES)[number]) {
  const categories = seed.categories.length;
  const subcategories = seed.categories.reduce(
    (n, c) => n + c.subcategories.length,
    0,
  );
  const incrementLevels = seed.categories.reduce(
    (n, c) =>
      n + c.subcategories.reduce((m, s) => m + (s.incrementLevels?.length ?? 0), 0),
    0,
  );
  return { categories, subcategories, incrementLevels };
}
