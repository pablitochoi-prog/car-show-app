import { describe, expect, it } from "vitest";
import { buildSmsVotingInstruction } from "@/lib/validation/sms-voting";

describe("buildSmsVotingInstruction", () => {
  it("single category includes category name", () => {
    expect(
      buildSmsVotingInstruction({
        vehicleEntryCode: "AXY-004",
        smsNumber: "22333",
        activeCategoryCount: 1,
        singleCategoryName: "People's Choice",
      }),
    ).toBe("People's Choice: Text AXY-004 to 22333");
  });

  it("multiple categories mentions reply flow", () => {
    const text = buildSmsVotingInstruction({
      vehicleEntryCode: "AXY-004",
      smsNumber: "22333",
      activeCategoryCount: 2,
    });
    expect(text).toContain("AXY-004");
    expect(text).toContain("award choices");
  });
});
