import { prisma } from "@/lib/db";

/** True when the judge has entered scores, notes, deductions, or saved/submitted a category. */
export async function scoreSheetHasJudgeWork(sheetId: string): Promise<boolean> {
  const sheet = await prisma.judgeScoreSheet.findUnique({
    where: { id: sheetId },
    select: {
      generalNotes: true,
      categoryAssignments: {
        where: { status: { not: "NOT_JUDGED" } },
        select: { id: true },
        take: 1,
      },
      sections: {
        select: {
          items: {
            select: {
              awardedPoints: true,
              itemNotes: true,
              deductions: { select: { id: true }, take: 1 },
            },
          },
        },
      },
    },
  });

  if (!sheet) return false;
  if (sheet.generalNotes?.trim()) return true;
  if (sheet.categoryAssignments.length > 0) return true;

  for (const section of sheet.sections) {
    for (const item of section.items) {
      if (item.awardedPoints != null) return true;
      if (item.itemNotes?.trim()) return true;
      if (item.deductions.length > 0) return true;
    }
  }

  return false;
}
