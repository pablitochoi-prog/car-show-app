import { prisma } from "@/lib/db";

/** Snapshot an event judging template into a new judge score sheet. */
export async function snapshotEventTemplateToScoreSheet(input: {
  eventId: string;
  eventJudgingTemplateId: string;
  eventJudgingClassId?: string | null;
  vehicleEntryCode: string;
  registrationId: string;
  registrationVehicleId?: string | null;
  judgeUserId: string;
}) {
  const template = await prisma.eventJudgingTemplate.findFirst({
    where: { id: input.eventJudgingTemplateId, eventId: input.eventId },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
            include: {
              deductionOptions: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!template) {
    throw new Error("Event judging template not found.");
  }

  const existing = await prisma.judgeScoreSheet.findUnique({
    where: {
      eventId_vehicleEntryCode_judgeUserId: {
        eventId: input.eventId,
        vehicleEntryCode: input.vehicleEntryCode,
        judgeUserId: input.judgeUserId,
      },
    },
    select: { id: true },
  });
  if (existing) {
    throw new Error("A score sheet already exists for this judge and vehicle.");
  }

  return prisma.judgeScoreSheet.create({
    data: {
      eventId: input.eventId,
      eventJudgingTemplateId: template.id,
      eventJudgingClassId: input.eventJudgingClassId ?? null,
      vehicleEntryCode: input.vehicleEntryCode,
      registrationId: input.registrationId,
      registrationVehicleId: input.registrationVehicleId ?? null,
      judgeUserId: input.judgeUserId,
      methodology: template.methodology,
      totalPoints: template.totalPoints,
      sections: {
        create: template.sections.map((section) => ({
          name: section.name,
          sortOrder: section.sortOrder,
          weightPercent: section.weightPercent,
          maxSectionPoints: section.maxSectionPoints,
          judgeGuidance: section.judgeGuidance,
          items: {
            create: section.items.map((item) => ({
              label: item.label,
              sortOrder: item.sortOrder,
              maxPoints: item.maxPoints,
              judgeGuidance: item.judgeGuidance,
              requiresCommentOnDeduction: item.requiresCommentOnDeduction,
              deductionOptions: {
                create: item.deductionOptions.map((opt) => ({
                  label: opt.label,
                  pointsDeducted: opt.pointsDeducted,
                  sortOrder: opt.sortOrder,
                  deductionBucket: opt.deductionBucket,
                })),
              },
            })),
          },
        })),
      },
    },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
            include: { deductionOptions: { orderBy: { sortOrder: "asc" } } },
          },
        },
      },
    },
  });
}
