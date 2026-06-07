import { describe, expect, it } from "vitest";
import { csvEscape, csvRow } from "./csv";

describe("csv helpers", () => {
  it("escapes commas and quotes", () => {
    expect(csvEscape("plain")).toBe("plain");
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape("line\nbreak")).toBe('"line\nbreak"');
  });

  it("builds a CSV row from mixed values", () => {
    expect(csvRow(["Name", 3, null, ""])).toBe("Name,3,,");
    expect(csvRow(["O'Brien", "City, ST"])).toBe("O'Brien,\"City, ST\"");
  });
});
