import { describe, expect, it } from "vitest";
import {
  normalizeVehicleEntryCodeFromSms,
  parseCategoryOptionNumber,
  parseInboundSmsBody,
} from "./normalize-vote-code";

describe("normalizeVehicleEntryCodeFromSms", () => {
  it("accepts canonical AXY-004", () => {
    expect(normalizeVehicleEntryCodeFromSms("AXY-004")).toBe("AXY-004");
  });

  it("accepts compact AXY004", () => {
    expect(normalizeVehicleEntryCodeFromSms("AXY004")).toBe("AXY-004");
  });

  it("accepts spaced AXY 004", () => {
    expect(normalizeVehicleEntryCodeFromSms("AXY 004")).toBe("AXY-004");
  });

  it("accepts vote prefix", () => {
    expect(normalizeVehicleEntryCodeFromSms("Vote AXY-004")).toBe("AXY-004");
    expect(normalizeVehicleEntryCodeFromSms("vote axy004")).toBe("AXY-004");
  });

  it("accepts legacy alphanumeric prefixes such as 53X-006", () => {
    expect(normalizeVehicleEntryCodeFromSms("53X-006")).toBe("53X-006");
    expect(normalizeVehicleEntryCodeFromSms("53X006")).toBe("53X-006");
  });

  it("rejects invalid codes", () => {
    expect(normalizeVehicleEntryCodeFromSms("hello")).toBeNull();
    expect(normalizeVehicleEntryCodeFromSms("AXY-04")).toBeNull();
    expect(normalizeVehicleEntryCodeFromSms("AX-004")).toBeNull();
  });
});

describe("parseCategoryOptionNumber", () => {
  it("accepts 1-3", () => {
    expect(parseCategoryOptionNumber("1")).toBe(1);
    expect(parseCategoryOptionNumber("2")).toBe(2);
    expect(parseCategoryOptionNumber("3")).toBe(3);
  });

  it("rejects other numbers", () => {
    expect(parseCategoryOptionNumber("4")).toBeNull();
    expect(parseCategoryOptionNumber("12")).toBeNull();
  });
});

describe("parseInboundSmsBody", () => {
  it("prefers category number over invalid vehicle parse", () => {
    expect(parseInboundSmsBody("1")).toEqual({
      kind: "category_number",
      optionNumber: 1,
    });
  });

  it("parses vehicle codes", () => {
    expect(parseInboundSmsBody("AXY004")).toEqual({
      kind: "vehicle_code",
      code: "AXY-004",
    });
  });

  it("returns invalid for garbage", () => {
    expect(parseInboundSmsBody("???")).toEqual({ kind: "invalid" });
  });
});
