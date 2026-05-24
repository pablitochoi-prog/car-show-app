import { describe, expect, it } from "vitest";
import {
  buildDashCardSmsLine,
  formatSmsNumberForDisplay,
} from "./sms-number-display";

describe("formatSmsNumberForDisplay", () => {
  it("formats US numbers as 888-382-1956", () => {
    expect(formatSmsNumberForDisplay("+18883821956")).toBe("888-382-1956");
    expect(formatSmsNumberForDisplay("8883821956")).toBe("888-382-1956");
  });

  it("leaves short codes unchanged", () => {
    expect(formatSmsNumberForDisplay("22333")).toBe("22333");
  });
});

describe("buildDashCardSmsLine", () => {
  it("builds Text vehicle id to formatted phone", () => {
    expect(buildDashCardSmsLine("AXY-004", "+18883821956")).toBe(
      "Text AXY-004 to 888-382-1956",
    );
  });
});
