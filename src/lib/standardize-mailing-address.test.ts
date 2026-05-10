import { describe, expect, it } from "vitest";
import {
  mailingAddressesMatch,
  normalizeMailingForCompare,
} from "./standardize-mailing-address";

describe("normalizeMailingForCompare", () => {
  it("normalizes spacing and case", () => {
    expect(
      normalizeMailingForCompare({
        street: "  10 Main St ",
        city: "Newark",
        state: "nj",
        zip: "07102-1234",
      })
    ).toEqual({
      street: "10 main st",
      city: "newark",
      state: "NJ",
      zip: "07102",
    });
  });
});

describe("mailingAddressesMatch", () => {
  it("returns true for equivalent addresses", () => {
    expect(
      mailingAddressesMatch(
        {
          street: "10 Main St",
          city: "Newark",
          state: "NJ",
          zip: "07102",
        },
        {
          street: "10 Main St",
          city: "newark",
          state: "nj",
          zip: "07102-9999",
        }
      )
    ).toBe(true);
  });

  it("returns false when street differs", () => {
    expect(
      mailingAddressesMatch(
        {
          street: "11 Main St",
          city: "Newark",
          state: "NJ",
          zip: "07102",
        },
        {
          street: "10 Main St",
          city: "Newark",
          state: "NJ",
          zip: "07102",
        }
      )
    ).toBe(false);
  });
});
