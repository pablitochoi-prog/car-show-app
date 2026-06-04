import { describe, expect, it, vi, beforeEach } from "vitest";

const { getUserEventRoles, userHasOrganizerStaffRole, userHasHeadJudgeStaffRole, canManageEvent } =
  vi.hoisted(() => ({
    getUserEventRoles: vi.fn(),
    userHasOrganizerStaffRole: vi.fn(),
    userHasHeadJudgeStaffRole: vi.fn(),
    canManageEvent: vi.fn(),
  }));

vi.mock("@/lib/event-staff", () => ({
  getUserEventRoles,
  userHasOrganizerStaffRole,
  userHasHeadJudgeStaffRole,
}));

vi.mock("@/lib/auth", () => ({ canManageEvent }));

import { canManageScoreSheetJudging } from "@/lib/judging/score-sheet-judging-period-auth";

describe("canManageScoreSheetJudging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserEventRoles.mockResolvedValue([]);
    userHasOrganizerStaffRole.mockResolvedValue(false);
    userHasHeadJudgeStaffRole.mockResolvedValue(false);
    canManageEvent.mockResolvedValue(false);
  });

  it("allows site admin", async () => {
    expect(await canManageScoreSheetJudging("u1", "e1", "ADMIN")).toBe(true);
  });

  it("allows head judge role", async () => {
    getUserEventRoles.mockResolvedValue(["HEAD_JUDGE"]);
    expect(await canManageScoreSheetJudging("u1", "e1", "USER")).toBe(true);
  });
});
