import type { GlobalTemplateSeed } from "@/lib/judging/seed-templates/judging-template-types";

/** Marque / Modified templates retained from original seed (additive / O-C). */
export const LEGACY_GLOBAL_TEMPLATES: GlobalTemplateSeed[] = [
  {
    slug: "marque-authenticity",
    name: "Marque Authenticity",
    scoringGroup: "Custom",
    vehicleType: "Auto",
    description:
      "Originality vs condition deduction template (700 points). Starter template — customize per event.",
    methodology: "ORIGINALITY_CONDITION",
    totalPoints: 700,
    sortOrder: 10,
    categories: [
      {
        name: "Originality",
        maxSectionPoints: 350,
        judgeGuidance: "Deduct for non-authentic or incorrect components.",
        subcategories: [
          {
            label: "Engine & Drivetrain Authenticity",
            maxPoints: 200,
            requiresCommentOnDeduction: true,
            scoringType: "LEVELS",
            pointType: "DEDUCT",
            incrementLevels: [
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
            scoringType: "LEVELS",
            pointType: "DEDUCT",
            incrementLevels: [
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
        maxSectionPoints: 350,
        judgeGuidance: "Deduct for wear, damage, or presentation issues.",
        subcategories: [
          {
            label: "Exterior Condition",
            maxPoints: 175,
            scoringType: "LEVELS",
            pointType: "DEDUCT",
            incrementLevels: [
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
            scoringType: "LEVELS",
            pointType: "DEDUCT",
            incrementLevels: [
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
    scoringGroup: "Custom",
    vehicleType: "Auto",
    description:
      "Additive scoring for modified and custom builds (700 points). Starter template — customize per event.",
    methodology: "ADDITIVE",
    totalPoints: 700,
    sortOrder: 11,
    categories: [
      {
        name: "Craftsmanship",
        maxSectionPoints: 245,
        subcategories: [
          {
            label: "Paint & Body Work",
            maxPoints: 150,
            pointType: "ADD",
            scoringType: "DISCRETIONARY",
            judgeGuidance: "Award points for quality of finish and bodywork.",
            incrementLevels: [],
          },
          {
            label: "Fabrication Quality",
            maxPoints: 95,
            pointType: "ADD",
            scoringType: "DISCRETIONARY",
            incrementLevels: [],
          },
        ],
      },
      {
        name: "Execution",
        maxSectionPoints: 245,
        subcategories: [
          {
            label: "Engine & Performance Build",
            maxPoints: 150,
            pointType: "ADD",
            scoringType: "DISCRETIONARY",
            incrementLevels: [],
          },
          {
            label: "Interior & Detail Work",
            maxPoints: 95,
            pointType: "ADD",
            scoringType: "DISCRETIONARY",
            incrementLevels: [],
          },
        ],
      },
      {
        name: "Presentation",
        maxSectionPoints: 210,
        subcategories: [
          {
            label: "Overall Theme & Cohesion",
            maxPoints: 130,
            pointType: "ADD",
            scoringType: "DISCRETIONARY",
            incrementLevels: [],
          },
          {
            label: "Display & Storytelling",
            maxPoints: 80,
            pointType: "ADD",
            scoringType: "DISCRETIONARY",
            incrementLevels: [],
          },
        ],
      },
    ],
  },
];
