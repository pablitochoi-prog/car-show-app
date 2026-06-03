import type { GlobalTemplateSeed } from "@/lib/judging/seed-templates/judging-template-types";
import { NCRS_EXTERIOR_CATEGORIES } from "@/lib/judging/seed-templates/ncrs-1968-1972-exterior-template";

/**
 * MCA sample provided mirrors the NCRS 1968-1972 exterior structure.
 * Seeded as a separate starter template for organizers to review/customize.
 */
export const MCA_1968_1972_EXTERIOR_TEMPLATE: GlobalTemplateSeed = {
  slug: "mca-1968-1972-exterior",
  name: "MCA 1968-1972 Exterior Starter",
  scoringGroup: "MCA",
  vehicleType: "Auto",
  description:
    "Starter exterior scorecard based on provided MCA sample sheet. This seed mirrors the NCRS 1968-1972 Corvette exterior layout from the uploaded sample; organizers must verify MCA-specific rules before use. Not an official MCA rulebook.",
  methodology: "DEDUCTION",
  totalPoints: 1075,
  sortOrder: 2,
  categories: NCRS_EXTERIOR_CATEGORIES.map((c) => ({
    ...c,
    subcategories: c.subcategories.map((s) => ({ ...s })),
  })),
};
