import { describe, expect, it } from "vitest";
import { splitUserDisplayName } from "./profile-display-name";

describe("splitUserDisplayName", () => {
  it("prefers stored first and last", () => {
    expect(
      splitUserDisplayName("Ignore Full", "Ann", "Smith")
    ).toEqual({ firstName: "Ann", lastName: "Smith" });
  });

  it("splits name when first/last empty", () => {
    expect(splitUserDisplayName("Mary Jane Watson", null, null)).toEqual({
      firstName: "Mary",
      lastName: "Jane Watson",
    });
  });
});
