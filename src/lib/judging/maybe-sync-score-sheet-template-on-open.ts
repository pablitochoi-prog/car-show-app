import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { scoreSheetHasJudgeWork } from "@/lib/judging/score-sheet-has-judge-work";
import { syncJudgeScoreSheetWithEventTemplate } from "@/lib/judging/sync-score-sheet-with-event-template";

function isMissingTemplateSyncedAtColumn(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2022") {
    return true;
  }
  return (
    err instanceof Error &&
    err.message.toLowerCase().includes("templatesyncedat")
  );
}

/** Prevents further template sync after first open sync or any judge work. */
export async function lockScoreSheetTemplateStructure(sheetId: string): Promise<void> {
  try {
    await prisma.judgeScoreSheet.updateMany({
      where: { id: sheetId, templateSyncedAt: null },
      data: { templateSyncedAt: new Date() },
    });
  } catch (err) {
    if (isMissingTemplateSyncedAtColumn(err)) return;
    throw err;
  }
}

/**
 * Syncs the score sheet from the live event template at most once when the judge opens the form.
 * Skips sync if the sheet was already synced or the judge has started work / saved progress.
 */
export async function maybeSyncScoreSheetTemplateOnOpen(
  sheetId: string,
): Promise<boolean> {
  let sheet: { status: string; templateSyncedAt: Date | null } | null;
  try {
    sheet = await prisma.judgeScoreSheet.findUnique({
      where: { id: sheetId },
      select: { status: true, templateSyncedAt: true },
    });
  } catch (err) {
    if (!isMissingTemplateSyncedAtColumn(err)) throw err;
    sheet = await prisma.judgeScoreSheet.findUnique({
      where: { id: sheetId },
      select: { status: true },
    }) as { status: string; templateSyncedAt: null } | null;
    if (sheet) sheet.templateSyncedAt = null;
  }

  if (!sheet || sheet.status !== "DRAFT" || sheet.templateSyncedAt) {
    return false;
  }

  if (await scoreSheetHasJudgeWork(sheetId)) {
    await lockScoreSheetTemplateStructure(sheetId);
    return false;
  }

  await syncJudgeScoreSheetWithEventTemplate(sheetId);
  await lockScoreSheetTemplateStructure(sheetId);
  return true;
}
