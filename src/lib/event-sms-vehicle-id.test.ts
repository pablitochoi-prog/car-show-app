import { describe, expect, it } from "vitest";
import {
  generateRandomVotePrefix,
  isValidPublicVehicleId,
  isValidVotePrefix,
  parseNumericSuffixFromPublicVehicleId,
} from "./event-sms-vehicle-id";

describe("parseNumericSuffixFromPublicVehicleId", () => {
  it("parses 3-digit suffix", () => {
    expect(parseNumericSuffixFromPublicVehicleId("AXY-005")).toBe(5);
    expect(parseNumericSuffixFromPublicVehicleId("AXY-999")).toBe(999);
  });

  it("returns 0 on invalid", () => {
    expect(parseNumericSuffixFromPublicVehicleId("BAD")).toBe(0);
  });
});

describe("generateRandomVotePrefix", () => {
  it("uses three letters A–Z excluding I and O", () => {
    for (let i = 0; i < 80; i++) {
      const p = generateRandomVotePrefix();
      expect(p).toHaveLength(3);
      expect(isValidVotePrefix(p)).toBe(true);
    }
  });
});

describe("isValidPublicVehicleId", () => {
  it("accepts ABC-005 style ids", () => {
    expect(isValidPublicVehicleId("AXY-005")).toBe(true);
    expect(isValidPublicVehicleId("axy-005")).toBe(true);
  });

  it("rejects I/O in prefix and non-3-digit suffix", () => {
    expect(isValidPublicVehicleId("AXI-005")).toBe(false);
    expect(isValidPublicVehicleId("AXO-005")).toBe(false);
    expect(isValidPublicVehicleId("AXY-5")).toBe(false);
    expect(isValidPublicVehicleId("AX2-005")).toBe(false);
  });
});
