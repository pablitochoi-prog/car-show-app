import { describe, expect, it } from "vitest";
import {
  EVENT_SHOW_NUMBER_START,
  formatEventShowNumber,
} from "./event-show-number";

describe("formatEventShowNumber", () => {
  it("formats with EVT- prefix", () => {
    expect(formatEventShowNumber(EVENT_SHOW_NUMBER_START)).toBe("EVT-1001");
    expect(formatEventShowNumber(2048)).toBe("EVT-2048");
  });
});
