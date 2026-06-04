import { prisma } from "@/lib/db";

/** Active judging class for an event scorecard template (first by sort order). */
export async function resolveJudgingClassIdForTemplate(
  eventId: string,
  eventJudgingTemplateId: string,
): Promise<string | null> {
  const judgingClass = await prisma.eventJudgingClass.findFirst({
    where: { eventId, eventJudgingTemplateId, isActive: true },
    select: { id: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return judgingClass?.id ?? null;
}

/** Backfill eventJudgingClassId when a sheet was created from category assignment only. */
export async function ensureScoreSheetJudgingClassLink(sheetId: string): Promise<void> {
  const sheet = await prisma.judgeScoreSheet.findUnique({
    where: { id: sheetId },
    select: {
      eventId: true,
      eventJudgingClassId: true,
      eventJudgingTemplateId: true,
    },
  });
  if (!sheet?.eventJudgingClassId) {
    const classId = sheet
      ? await resolveJudgingClassIdForTemplate(
          sheet.eventId,
          sheet.eventJudgingTemplateId,
        )
      : null;
    if (classId) {
      await prisma.judgeScoreSheet.update({
        where: { id: sheetId },
        data: { eventJudgingClassId: classId },
      });
    }
  }
}

/** Link orphan sheets (null class) that belong to this template so results can find them. */
export async function backfillJudgingClassOnOrphanSheets(input: {
  eventId: string;
  judgingClassId: string;
  eventJudgingTemplateId: string;
}): Promise<number> {
  const result = await prisma.judgeScoreSheet.updateMany({
    where: {
      eventId: input.eventId,
      eventJudgingClassId: null,
      eventJudgingTemplateId: input.eventJudgingTemplateId,
    },
    data: { eventJudgingClassId: input.judgingClassId },
  });
  return result.count;
}
