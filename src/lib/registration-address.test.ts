import { describe, expect, it } from "vitest";
import {
  formatRegistrationMailingAddress,
  hasCompleteMailingAddress,
} from "./registration-address";

describe("formatRegistrationMailingAddress", () => {
  it("formats street and city/state/zip", () => {
    expect(
      formatRegistrationMailingAddress({
        street: "123 Main St",
        city: "Springfield",
        state: "NJ",
        zip: "07001",
      }),
    ).toBe("123 Main St, Springfield, NJ 07001");
  });
});

describe("hasCompleteMailingAddress", () => {
  it("requires all parts", () => {
    expect(
      hasCompleteMailingAddress({
        street: "1 Main",
        city: "Town",
        state: "NY",
        zip: "10001",
      }),
    ).toBe(true);
    expect(
      hasCompleteMailingAddress({
        street: "",
        city: "Town",
        state: "NY",
        zip: "10001",
      }),
    ).toBe(false);
  });
});
