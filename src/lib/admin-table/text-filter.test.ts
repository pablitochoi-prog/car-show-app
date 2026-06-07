import { describe, expect, it } from "vitest";
import {
  encodeTextFilter,
  parseTextFilter,
  prismaStringFilter,
} from "./text-filter";

describe("text-filter", () => {
  it("encodes and parses filter mode prefix", () => {
    expect(encodeTextFilter("startsWith", "connect")).toBe("startsWith:connect");
    expect(parseTextFilter("equals:connect-stripe")).toEqual({
      mode: "equals",
      value: "connect-stripe",
    });
    expect(parseTextFilter("legacy-plain")).toEqual({
      mode: "contains",
      value: "legacy-plain",
    });
  });

  it("maps modes to prisma string filters", () => {
    expect(prismaStringFilter("contains", "abc")).toEqual({
      contains: "abc",
      mode: "insensitive",
    });
    expect(prismaStringFilter("equals", "abc")).toEqual({
      equals: "abc",
      mode: "insensitive",
    });
  });
});
