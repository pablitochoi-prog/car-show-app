import { describe, expect, it } from "vitest";
import {
  buildEventAwardTrophyEntries,
  categoryPlaceEntryId,
  computeTrophyCountAfterRemovals,
  parseAwardTrophyEntryId,
} from "./event-awards-trophies";

describe("buildEventAwardTrophyEntries", () => {
  it("includes category place awards and special awards", () => {
    const entries = buildEventAwardTrophyEntries({
      categories: [{ id: "c1", name: "Classic", trophyCount: 2 }],
      specialAwards: [{ id: "a1", name: "Best in Show" }],
    });
    expect(entries).toHaveLength(3);
    expect(entries[0].kind).toBe("category_place");
    expect(entries[0].label).toBe("Best Classic — 1st Place");
    expect(entries[2].kind).toBe("special");
  });
});

describe("computeTrophyCountAfterRemovals", () => {
  it("reduces trophy count by number of removed place awards per category", () => {
    const id1 = categoryPlaceEntryId("c1", 1);
    const id2 = categoryPlaceEntryId("c1", 2);
    const next = computeTrophyCountAfterRemovals(
      [{ id: "c1", trophyCount: 3 }],
      [id1, id2],
    );
    expect(next.get("c1")).toBe(1);
  });
});

describe("parseAwardTrophyEntryId", () => {
  it("parses place and special ids", () => {
    expect(parseAwardTrophyEntryId("place:abc:2")).toEqual({
      kind: "category_place",
      eventCategoryId: "abc",
      placeIndex: 2,
    });
    expect(parseAwardTrophyEntryId("special:xyz")).toEqual({
      kind: "special",
      eventAwardId: "xyz",
    });
  });
});
