/**
 * Seed four global judging templates (PCA, AACA, Marque Authenticity, Modified/Custom).
 * Run with: npm run db:seed-judging-templates
 */
import { PrismaClient, type JudgingDeductionBucket } from "@prisma/client";

const prisma = new PrismaClient();

type DeductionSeed = {
  label: string;
  pointsDeducted: number;
  deductionBucket?: JudgingDeductionBucket;
};

type ItemSeed = {
  label: string;
  maxPoints: number;
  judgeGuidance?: string;
  requiresCommentOnDeduction?: boolean;
  deductions?: DeductionSeed[];
};

type SectionSeed = {
  name: string;
  weightPercent?: number;
  maxSectionPoints?: number;
  judgeGuidance?: string;
  items: ItemSeed[];
};

type TemplateSeed = {
  slug: string;
  name: string;
  description: string;
  methodology: "DEDUCTION" | "ADDITIVE" | "ORIGINALITY_CONDITION";
  totalPoints: number;
  sortOrder: number;
  sections: SectionSeed[];
};

const TEMPLATES: TemplateSeed[] = [
  {
    slug: "pca",
    name: "PCA (Porsche Club)",
    description:
      "Deduction-based Porsche Club of America judging template (300 points).",
    methodology: "DEDUCTION",
    totalPoints: 300,
    sortOrder: 0,
    sections: [
      {
        name: "Exterior",
        maxSectionPoints: 100,
        judgeGuidance: "Evaluate paint, panel gaps, trim, and overall finish.",
        items: [
          {
            label: "Paint & Finish",
            maxPoints: 50,
            deductions: [
              { label: "Minor blemish", pointsDeducted: 1 },
              { label: "Major blemish", pointsDeducted: 5 },
            ],
          },
          {
            label: "Body & Panel Alignment",
            maxPoints: 30,
            deductions: [
              { label: "Misalignment", pointsDeducted: 2 },
              { label: "Significant gap issue", pointsDeducted: 5 },
            ],
          },
          {
            label: "Trim & Brightwork",
            maxPoints: 20,
            deductions: [{ label: "Missing or damaged trim", pointsDeducted: 3 }],
          },
        ],
      },
      {
        name: "Interior",
        maxSectionPoints: 100,
        items: [
          {
            label: "Upholstery & Carpets",
            maxPoints: 40,
            deductions: [{ label: "Wear or stain", pointsDeducted: 2 }],
          },
          {
            label: "Instruments & Controls",
            maxPoints: 30,
            deductions: [{ label: "Non-functional item", pointsDeducted: 5 }],
          },
          {
            label: "Overall Presentation",
            maxPoints: 30,
            deductions: [{ label: "Cleanliness issue", pointsDeducted: 1 }],
          },
        ],
      },
      {
        name: "Engine & Mechanical",
        maxSectionPoints: 100,
        items: [
          {
            label: "Engine Bay Presentation",
            maxPoints: 40,
            deductions: [{ label: "Incorrect component", pointsDeducted: 3 }],
          },
          {
            label: "Mechanical Integrity",
            maxPoints: 40,
            deductions: [{ label: "Leak or wear", pointsDeducted: 4 }],
          },
          {
            label: "Undercarriage",
            maxPoints: 20,
            deductions: [{ label: "Rust or damage", pointsDeducted: 5 }],
          },
        ],
      },
    ],
  },
  {
    slug: "aaca",
    name: "AACA (Antique Automobile Club)",
    description:
      "Deduction-based AACA judging template (400 points).",
    methodology: "DEDUCTION",
    totalPoints: 400,
    sortOrder: 1,
    sections: [
      {
        name: "Exterior",
        maxSectionPoints: 130,
        items: [
          {
            label: "Paint & Finish",
            maxPoints: 60,
            deductions: [
              { label: "Minor flaw", pointsDeducted: 1 },
              { label: "Major flaw", pointsDeducted: 5 },
            ],
          },
          {
            label: "Body & Fenders",
            maxPoints: 40,
            deductions: [{ label: "Body damage", pointsDeducted: 4 }],
          },
          {
            label: "Chrome & Trim",
            maxPoints: 30,
            deductions: [{ label: "Pitting or damage", pointsDeducted: 3 }],
          },
        ],
      },
      {
        name: "Interior",
        maxSectionPoints: 130,
        items: [
          {
            label: "Upholstery",
            maxPoints: 50,
            deductions: [{ label: "Wear", pointsDeducted: 2 }],
          },
          {
            label: "Dashboard & Instruments",
            maxPoints: 40,
            deductions: [{ label: "Incorrect or missing", pointsDeducted: 5 }],
          },
          {
            label: "Headliner & Trim",
            maxPoints: 40,
            deductions: [{ label: "Damage", pointsDeducted: 3 }],
          },
        ],
      },
      {
        name: "Mechanical",
        maxSectionPoints: 140,
        items: [
          {
            label: "Engine",
            maxPoints: 60,
            deductions: [{ label: "Non-period component", pointsDeducted: 5 }],
          },
          {
            label: "Chassis & Running Gear",
            maxPoints: 50,
            deductions: [{ label: "Wear or modification", pointsDeducted: 4 }],
          },
          {
            label: "Authenticity",
            maxPoints: 30,
            deductions: [{ label: "Incorrect part", pointsDeducted: 3 }],
          },
        ],
      },
    ],
  },
  {
    slug: "marque-authenticity",
    name: "Marque Authenticity",
    description:
      "Originality vs condition deduction template (700 points).",
    methodology: "ORIGINALITY_CONDITION",
    totalPoints: 700,
    sortOrder: 2,
    sections: [
      {
        name: "Originality",
        judgeGuidance: "Deduct for non-authentic or incorrect components.",
        items: [
          {
            label: "Engine & Drivetrain Authenticity",
            maxPoints: 200,
            requiresCommentOnDeduction: true,
            deductions: [
              {
                label: "Non-original engine component",
                pointsDeducted: 10,
                deductionBucket: "ORIGINALITY",
              },
              {
                label: "Incorrect drivetrain part",
                pointsDeducted: 15,
                deductionBucket: "ORIGINALITY",
              },
            ],
          },
          {
            label: "Body & Trim Authenticity",
            maxPoints: 150,
            deductions: [
              {
                label: "Aftermarket body modification",
                pointsDeducted: 20,
                deductionBucket: "ORIGINALITY",
              },
            ],
          },
        ],
      },
      {
        name: "Condition",
        judgeGuidance: "Deduct for wear, damage, or presentation issues.",
        items: [
          {
            label: "Exterior Condition",
            maxPoints: 175,
            deductions: [
              {
                label: "Paint defect",
                pointsDeducted: 5,
                deductionBucket: "CONDITION",
              },
              {
                label: "Rust or corrosion",
                pointsDeducted: 15,
                deductionBucket: "CONDITION",
              },
            ],
          },
          {
            label: "Interior Condition",
            maxPoints: 175,
            deductions: [
              {
                label: "Upholstery wear",
                pointsDeducted: 5,
                deductionBucket: "CONDITION",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "modified-custom",
    name: "Modified / Custom",
    description:
      "Additive scoring for modified and custom builds (700 points).",
    methodology: "ADDITIVE",
    totalPoints: 700,
    sortOrder: 3,
    sections: [
      {
        name: "Craftsmanship",
        weightPercent: 35,
        items: [
          {
            label: "Paint & Body Work",
            maxPoints: 150,
            judgeGuidance: "Award points for quality of finish and bodywork.",
          },
          {
            label: "Fabrication Quality",
            maxPoints: 95,
          },
        ],
      },
      {
        name: "Execution",
        weightPercent: 35,
        items: [
          {
            label: "Engine & Performance Build",
            maxPoints: 150,
          },
          {
            label: "Interior & Detail Work",
            maxPoints: 95,
          },
        ],
      },
      {
        name: "Presentation",
        weightPercent: 30,
        items: [
          {
            label: "Overall Theme & Cohesion",
            maxPoints: 130,
          },
          {
            label: "Display & Storytelling",
            maxPoints: 80,
          },
        ],
      },
    ],
  },
];

async function upsertTemplate(seed: TemplateSeed) {
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
      methodology: seed.methodology,
      totalPoints: seed.totalPoints,
      sortOrder: seed.sortOrder,
      isActive: true,
      sections: {
        create: seed.sections.map((section, si) => ({
          name: section.name,
          sortOrder: si,
          weightPercent: section.weightPercent ?? null,
          maxSectionPoints: section.maxSectionPoints ?? null,
          judgeGuidance: section.judgeGuidance ?? null,
          items: {
            create: section.items.map((item, ii) => ({
              label: item.label,
              sortOrder: ii,
              maxPoints: item.maxPoints,
              judgeGuidance: item.judgeGuidance ?? null,
              requiresCommentOnDeduction: item.requiresCommentOnDeduction ?? false,
              deductionOptions: {
                create: (item.deductions ?? []).map((d, di) => ({
                  label: d.label,
                  pointsDeducted: d.pointsDeducted,
                  sortOrder: di,
                  deductionBucket: d.deductionBucket ?? null,
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
  for (const template of TEMPLATES) {
    await upsertTemplate(template);
    console.log(`  ✓ ${template.name} (${template.totalPoints} pts)`);
  }
  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
