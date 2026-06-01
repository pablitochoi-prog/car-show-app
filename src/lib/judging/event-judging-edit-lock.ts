import type { EventJudgingTemplateEditLock, JudgeScoreSheetStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export type EventTemplateEditLockInfo = {
  editLock: EventJudgingTemplateEditLock;
  draftCount: number;
  submittedCount: number;
  finalizedCount: number;
  totalScoreSheets: number;
  canEditStructure: boolean;
  canEditGuidance: boolean;
  showDraftWarning: boolean;
};

function lockFromCounts(counts: Record<JudgeScoreSheetStatus, number>): EventJudgingTemplateEditLock {
  if (counts.SUBMITTED > 0 || counts.FINALIZED > 0) return "LOCKED";
  if (counts.DRAFT > 0) return "DRAFT_WARNING";
  return "OPEN";
}

/** Resolve edit permissions from existing score sheets for an event template. */
export async function resolveEventTemplateEditLock(
  templateId: string,
): Promise<EventTemplateEditLockInfo> {
  const grouped = await prisma.judgeScoreSheet.groupBy({
    by: ["status"],
    where: { eventJudgingTemplateId: templateId },
    _count: { _all: true },
  });

  const counts: Record<JudgeScoreSheetStatus, number> = {
    DRAFT: 0,
    SUBMITTED: 0,
    FINALIZED: 0,
  };
  for (const row of grouped) {
    counts[row.status] = row._count._all;
  }

  const editLock = lockFromCounts(counts);
  const totalScoreSheets = counts.DRAFT + counts.SUBMITTED + counts.FINALIZED;

  return {
    editLock,
    draftCount: counts.DRAFT,
    submittedCount: counts.SUBMITTED,
    finalizedCount: counts.FINALIZED,
    totalScoreSheets,
    canEditStructure: editLock !== "LOCKED",
    canEditGuidance: true,
    showDraftWarning: editLock === "DRAFT_WARNING",
  };
}

/** Persist editLock on the template row (call after score sheet status changes). */
export async function syncEventTemplateEditLock(templateId: string): Promise<EventJudgingTemplateEditLock> {
  const info = await resolveEventTemplateEditLock(templateId);
  await prisma.eventJudgingTemplate.update({
    where: { id: templateId },
    data: { editLock: info.editLock },
  });
  return info.editLock;
}
