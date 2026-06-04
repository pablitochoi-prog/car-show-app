import type { JudgingDeductionBucket } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  assertSavableSectionIds,
  loadScorecardSaveContext,
  recalculateAndStoreSheetScore,
  updateAssignmentStatusesForSheet,
} from "@/lib/judging/judge-assigned-scorecard-save";
import {
  validateEditableSectionItems,
  type ScorecardItemDraftInput,
} from "@/lib/judging/judge-assigned-scorecard-validation";
import { resolveScorecardOptionForSelection } from "@/lib/judging/resolve-scorecard-option";
import { resolveEventSectionIdsForAssignmentUpdate } from "@/lib/judging/judge-scorecard-section-assignment";
import { lockScoreSheetTemplateStructure } from "@/lib/judging/maybe-sync-score-sheet-template-on-open";
import { ensureScoreSheetJudgingClassLink } from "@/lib/judging/score-sheet-judging-class-link";
import { JudgeScoreSheetAccessError } from "@/lib/judging/judge-score-sheet-judge-data";
import {
  assertScoreSheetJudgingOpenForJudges,
  ScoreSheetJudgingPeriodError,
} from "@/lib/judging/score-sheet-judging-period";

export type SaveAssignedScorecardInput = {
  judgeUserId: string;
  eventId: string;
  sheetId: string;
  generalNotes?: string;
  sectionIds: string[];
  items: ScorecardItemDraftInput[];
  /** When true (submit), required deduction comments are enforced. Save-for-later skips them. */
  requireComments?: boolean;
};

async function persistScorecardItems(
  items: ScorecardItemDraftInput[],
  itemMeta: Map<
    string,
    {
      scoringType: string;
      label: string;
      deductionOptions: Array<{ id: string; label: string; pointsDeducted: number }>;
    }
  >,
) {
  const updateByItem = new Map(items.map((i) => [i.itemId, i]));

  await prisma.$transaction(async (tx) => {
    for (const [itemId, draft] of updateByItem) {
      const meta = itemMeta.get(itemId);
      if (!meta) {
        throw new JudgeScoreSheetAccessError(
          "INVALID_ITEM",
          "Score item no longer exists. Refresh the scorecard and try again.",
        );
      }

      await tx.judgeScoreSheetItem.update({
        where: { id: itemId },
        data: { itemNotes: draft.itemNotes?.trim() || null },
      });
      await tx.judgeScoreSheetDeduction.deleteMany({ where: { itemId } });

      if (meta.scoringType === "DISCRETIONARY") {
        const pts = Math.round(draft.discretionaryPoints ?? 0);
        if (pts > 0) {
          await tx.judgeScoreSheetDeduction.create({
            data: {
              itemId,
              label: "Deduction",
              pointsDeducted: pts,
              discretionaryPoints: pts,
              violationCount: 1,
            },
          });
        }
        continue;
      }

      for (const sel of draft.levelSelections ?? []) {
        const opt = resolveScorecardOptionForSelection(meta.deductionOptions, {
          optionId: sel.optionId,
        });
        if (!opt) {
          throw new JudgeScoreSheetAccessError(
            "INVALID_OPTION",
            `Invalid selection for "${meta.label}". Refresh the scorecard and try again.`,
          );
        }
        const violationCount = Math.max(1, sel.violationCount ?? 1);
        await tx.judgeScoreSheetDeduction.create({
          data: {
            itemId,
            optionId: opt.id,
            label: opt.label,
            pointsDeducted: opt.pointsDeducted,
            violationCount,
            comment: draft.deductionComments?.[sel.optionId]?.trim() || null,
            deductionBucket: null as JudgingDeductionBucket | null,
          },
        });
      }
    }
  });
}

function buildItemMetaFromSavableSections(
  savableSections: Awaited<ReturnType<typeof assertSavableSectionIds>>,
) {
  const map = new Map<
    string,
    {
      scoringType: string;
      label: string;
      maxPoints: number;
      allowMultipleViolations: boolean;
      requiresCommentOnDeduction: boolean;
      deductionOptions: Array<{ id: string; label: string; pointsDeducted: number }>;
    }
  >();
  for (const section of savableSections) {
    for (const item of section.items) {
      map.set(item.id, {
        scoringType: item.scoringType,
        label: item.label,
        maxPoints: item.maxPoints,
        allowMultipleViolations: item.allowMultipleViolations,
        requiresCommentOnDeduction: item.requiresCommentOnDeduction,
        deductionOptions: item.deductionOptions,
      });
    }
  }
  return map;
}

export async function saveAssignedScorecardDraft(
  input: SaveAssignedScorecardInput,
): Promise<{ ok: true; itemsSaved: number; assignmentsUpdated: number }> {
  try {
    await assertScoreSheetJudgingOpenForJudges(input.eventId);
  } catch (e) {
    if (e instanceof ScoreSheetJudgingPeriodError) {
      throw new JudgeScoreSheetAccessError("JUDGING_CLOSED", e.message);
    }
    throw e;
  }

  const ctx = await loadScorecardSaveContext(
    input.judgeUserId,
    input.eventId,
    input.sheetId,
  );

  const savableSections = await assertSavableSectionIds(ctx, input.sectionIds);
  const itemMeta = buildItemMetaFromSavableSections(savableSections);
  const editableItemIds = new Set(itemMeta.keys());
  const itemsToSave = input.items.filter((row) => editableItemIds.has(row.itemId));

  const editableItems = savableSections.flatMap((s) => s.items);
  validateEditableSectionItems(
    editableItems.map((i) => ({
      id: i.id,
      label: i.label,
      maxPoints: i.maxPoints,
      scoringType: i.scoringType as "DISCRETIONARY" | "LEVELS" | "FULL",
      allowMultipleViolations: i.allowMultipleViolations,
      requiresCommentOnDeduction: i.requiresCommentOnDeduction,
      deductionOptions: i.deductionOptions.map((o) => ({
        id: o.id,
        label: o.label,
        pointsDeducted: o.pointsDeducted,
      })),
    })),
    itemsToSave,
    ctx.methodology,
    false,
    input.requireComments ?? false,
  );

  await prisma.judgeScoreSheet.update({
    where: { id: input.sheetId },
    data: { generalNotes: input.generalNotes?.trim() || null },
  });

  await persistScorecardItems(itemsToSave, itemMeta);

  await resolveEventSectionIdsForAssignmentUpdate({
    eventId: ctx.eventId,
    judgeUserId: ctx.judgeUserId,
    registrationVehicleId: ctx.registrationVehicleId,
    sheetSections: ctx.sections.map((s) => ({
      id: s.id,
      eventJudgingSectionId: s.eventJudgingSectionId,
      name: s.name,
    })),
    sheetSectionIds: input.sectionIds,
  });

  const assignmentsUpdated = await updateAssignmentStatusesForSheet({
    sheetId: ctx.sheetId,
    eventId: ctx.eventId,
    judgeUserId: ctx.judgeUserId,
    registrationVehicleId: ctx.registrationVehicleId,
    vehicleEntryCode: ctx.vehicleEntryCode,
    sheetSections: ctx.sections.map((s) => ({
      id: s.id,
      name: s.name,
      eventJudgingSectionId: s.eventJudgingSectionId,
    })),
    sheetSectionIds: input.sectionIds,
    status: "SAVED_FOR_LATER",
  });

  await recalculateAndStoreSheetScore(input.sheetId);
  await ensureScoreSheetJudgingClassLink(input.sheetId);
  await lockScoreSheetTemplateStructure(input.sheetId);

  return { ok: true, itemsSaved: itemsToSave.length, assignmentsUpdated };
}

function sectionIdsFromSaveItems(
  ctx: Awaited<ReturnType<typeof loadScorecardSaveContext>>,
  items: ScorecardItemDraftInput[],
  explicitSectionIds?: string[],
): string[] {
  const itemIds = new Set(items.map((i) => i.itemId).filter(Boolean));
  const fromItems = ctx.sections
    .filter((sec) => sec.items.some((it) => itemIds.has(it.id)))
    .map((sec) => sec.id);

  if (explicitSectionIds && explicitSectionIds.length > 0) {
    const allowed = new Set(fromItems);
    const picked = explicitSectionIds.filter((id) => allowed.has(id));
    if (picked.length > 0) return picked;
  }

  return fromItems;
}

export async function submitAssignedScorecard(input: {
  judgeUserId: string;
  eventId: string;
  sheetId: string;
  generalNotes?: string;
  sectionIds?: string[];
  items: ScorecardItemDraftInput[];
}): Promise<{ ok: true }> {
  const ctx = await loadScorecardSaveContext(
    input.judgeUserId,
    input.eventId,
    input.sheetId,
  );

  const savableSectionIds = sectionIdsFromSaveItems(
    ctx,
    input.items,
    input.sectionIds,
  );

  if (savableSectionIds.length === 0) {
    throw new JudgeScoreSheetAccessError(
      "READ_ONLY",
      "No assigned categories are available to submit.",
    );
  }

  await saveAssignedScorecardDraft({
    ...input,
    sectionIds: savableSectionIds,
    requireComments: true,
  });

  await updateAssignmentStatusesForSheet({
    sheetId: ctx.sheetId,
    eventId: ctx.eventId,
    judgeUserId: ctx.judgeUserId,
    registrationVehicleId: ctx.registrationVehicleId,
    vehicleEntryCode: ctx.vehicleEntryCode,
    sheetSections: ctx.sections.map((s) => ({
      id: s.id,
      name: s.name,
      eventJudgingSectionId: s.eventJudgingSectionId,
    })),
    sheetSectionIds: savableSectionIds,
    status: "SUBMITTED",
  });

  await prisma.judgeScoreSheet.update({
    where: { id: input.sheetId },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      finalizedAt: new Date(),
    },
  });

  return { ok: true };
}
