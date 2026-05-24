import { describe, expect, it } from "vitest";
import {
  hashPhoneNumberWithSecret,
  normalizePhoneForHash,
} from "./hash-phone";

describe("normalizePhoneForHash", () => {
  it("normalizes US 10-digit numbers", () => {
    expect(normalizePhoneForHash("6195551212")).toBe("+16195551212");
  });

  it("preserves E.164 input", () => {
    expect(normalizePhoneForHash("+16195551212")).toBe("+16195551212");
  });
});

describe("hashPhoneNumberWithSecret", () => {
  it("is deterministic for the same input", () => {
    const a = hashPhoneNumberWithSecret("+16195551212", "test-secret");
    const b = hashPhoneNumberWithSecret("+16195551212", "test-secret");
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it("differs for different numbers", () => {
    const a = hashPhoneNumberWithSecret("+16195551212", "test-secret");
    const b = hashPhoneNumberWithSecret("+16195551213", "test-secret");
    expect(a).not.toBe(b);
  });
});
