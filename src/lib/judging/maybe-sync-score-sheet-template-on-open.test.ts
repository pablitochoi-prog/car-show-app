import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    judgeScoreSheet: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/judging/score-sheet-has-judge-work", () => ({
  scoreSheetHasJudgeWork: vi.fn(),
}));

vi.mock("@/lib/judging/sync-score-sheet-with-event-template", () => ({
  syncJudgeScoreSheetWithEventTemplate: vi.fn(),
}));

import { prisma } from "@/lib/db";
import {
  lockScoreSheetTemplateStructure,
  maybeSyncScoreSheetTemplateOnOpen,
} from "@/lib/judging/maybe-sync-score-sheet-template-on-open";
import { scoreSheetHasJudgeWork } from "@/lib/judging/score-sheet-has-judge-work";
import { syncJudgeScoreSheetWithEventTemplate } from "@/lib/judging/sync-score-sheet-with-event-template";

describe("maybeSyncScoreSheetTemplateOnOpen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.judgeScoreSheet.updateMany).mockResolvedValue({ count: 1 });
  });

  it("skips when already synced", async () => {
    vi.mocked(prisma.judgeScoreSheet.findUnique).mockResolvedValue({
      status: "DRAFT",
      templateSyncedAt: new Date(),
    } as never);

    const synced = await maybeSyncScoreSheetTemplateOnOpen("sheet-1");

    expect(synced).toBe(false);
    expect(syncJudgeScoreSheetWithEventTemplate).not.toHaveBeenCalled();
  });

  it("locks without sync when judge work exists", async () => {
    vi.mocked(prisma.judgeScoreSheet.findUnique).mockResolvedValue({
      status: "DRAFT",
      templateSyncedAt: null,
    } as never);
    vi.mocked(scoreSheetHasJudgeWork).mockResolvedValue(true);

    const synced = await maybeSyncScoreSheetTemplateOnOpen("sheet-1");

    expect(synced).toBe(false);
    expect(syncJudgeScoreSheetWithEventTemplate).not.toHaveBeenCalled();
    expect(prisma.judgeScoreSheet.updateMany).toHaveBeenCalled();
  });

  it("syncs once on first open when no work", async () => {
    vi.mocked(prisma.judgeScoreSheet.findUnique).mockResolvedValue({
      status: "DRAFT",
      templateSyncedAt: null,
    } as never);
    vi.mocked(scoreSheetHasJudgeWork).mockResolvedValue(false);
    vi.mocked(syncJudgeScoreSheetWithEventTemplate).mockResolvedValue(undefined);

    const synced = await maybeSyncScoreSheetTemplateOnOpen("sheet-1");

    expect(synced).toBe(true);
    expect(syncJudgeScoreSheetWithEventTemplate).toHaveBeenCalledWith("sheet-1");
    expect(prisma.judgeScoreSheet.updateMany).toHaveBeenCalled();
  });
});

describe("lockScoreSheetTemplateStructure", () => {
  it("sets templateSyncedAt when unset", async () => {
    await lockScoreSheetTemplateStructure("sheet-1");
    expect(prisma.judgeScoreSheet.updateMany).toHaveBeenCalledWith({
      where: { id: "sheet-1", templateSyncedAt: null },
      data: { templateSyncedAt: expect.any(Date) },
    });
  });
});
