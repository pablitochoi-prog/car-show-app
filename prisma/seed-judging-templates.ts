/**
 * Seed global judging templates (scorecard starters + legacy Marque/Modified).
 * Run with: npm run db:seed-judging-templates
 */
import { PrismaClient } from "@prisma/client";
import {
  ALL_GLOBAL_JUDGING_TEMPLATE_SEEDS,
  globalTemplateSeedToScorecardInput,
  type GlobalTemplateSeed,
} from "@/lib/judging/seed-templates";
import {
  formatScorecardValidationError,
  isScorecardTemplateValid,
  validateScorecardTemplateStructure,
} from "@/lib/judging/scorecard-template-validation";

const prisma = new PrismaClient();

function assertSeedValid(seed: GlobalTemplateSeed) {
  const input = globalTemplateSeedToScorecardInput(seed);
  const errors = validateScorecardTemplateStructure(input);
  if (errors.length > 0) {
    const messages = errors.map(formatScorecardValidationError).join("\n");
    throw new Error(`Seed template "${seed.slug}" failed validation:\n${messages}`);
  }
  if (!isScorecardTemplateValid(input)) {
    throw new Error(`Seed template "${seed.slug}" is invalid.`);
  }
}

async function upsertTemplate(seed: GlobalTemplateSeed) {
  assertSeedValid(seed);

  const existing = await prisma.judgingTemplate.findUnique({
    where: { slug: seed.slug },
    select: { id: true },
  });

  if (existing) {
    await prisma.judgingTemplateDeductionOption.deleteMany({
      where: { item: { section: { templateId: existing.id } } },
    });
    await prisma.judgingTemplateItem.deleteMany({
      where: { section: { templateId: existing.id } },
    });
    await prisma.judgingTemplateSection.deleteMany({
      where: { templateId: existing.id },
    });
    await prisma.judgingTemplate.delete({ where: { id: existing.id } });
  }

  await prisma.judgingTemplate.create({
    data: {
      slug: seed.slug,
      name: seed.name,
      description: seed.description,
      scoringGroup: seed.scoringGroup,
      vehicleType: seed.vehicleType,
      methodology: seed.methodology,
      totalPoints: seed.totalPoints,
      sortOrder: seed.sortOrder,
      isActive: true,
      sections: {
        create: seed.categories.map((category, ci) => ({
          name: category.name,
          sortOrder: ci,
          maxSectionPoints: category.maxSectionPoints,
          judgeGuidance: category.judgeGuidance ?? null,
          isActive: category.isActive !== false,
          items: {
            create: category.subcategories.map((sub, si) => ({
              label: sub.label,
              sortOrder: si,
              maxPoints: sub.maxPoints,
              isIndented: sub.isIndented ?? false,
              pointType: sub.pointType ?? null,
              scoringType: sub.scoringType ?? "LEVELS",
              allowMultipleViolations: sub.allowMultipleViolations ?? false,
              judgeGuidance: sub.judgeGuidance ?? null,
              requiresCommentOnDeduction: sub.requiresCommentOnDeduction ?? false,
              isActive: sub.isActive !== false,
              deductionOptions: {
                create: (sub.incrementLevels ?? []).map((inc, ii) => ({
                  label: inc.label,
                  pointsDeducted: inc.pointsDeducted,
                  sortOrder: ii,
                  deductionBucket: inc.deductionBucket ?? null,
                })),
              },
            })),
          },
        })),
      },
    },
  });
}

async function main() {
  console.log("Seeding global judging templates…");
  for (const template of ALL_GLOBAL_JUDGING_TEMPLATE_SEEDS) {
    await upsertTemplate(template);
    const cats = template.categories.length;
    const subs = template.categories.reduce((n, c) => n + c.subcategories.length, 0);
    console.log(
      `  ✓ ${template.name} (${template.scoringGroup}, ${template.totalPoints} pts, ${cats} categories, ${subs} subcategories)`,
    );
  }
  console.log("Done! Event copies are not modified — only global master templates.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
