import { describe, expect, it } from "vitest";
import { buildClonedEventName } from "./clone-event-name";

describe("buildClonedEventName", () => {
  it("appends (2) when cloning an unversioned name", () => {
    expect(
      buildClonedEventName("Cruizin Classic Car show", [
        "Cruizin Classic Car show",
      ]),
    ).toBe("Cruizin Classic Car show (2)");
  });

  it("increments the version when clones already exist", () => {
    expect(
      buildClonedEventName("Cruizin Classic Car show (2)", [
        "Cruizin Classic Car show",
        "Cruizin Classic Car show (2)",
      ]),
    ).toBe("Cruizin Classic Car show (3)");
  });
});
