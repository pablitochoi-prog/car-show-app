import { describe, expect, it } from "vitest";
import { createCarClubSchema } from "./organization";

describe("createCarClubSchema", () => {
  it("accepts empty clubState as omitted", () => {
    const r = createCarClubSchema.safeParse({
      name: "Test Club Here",
      clubState: "",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.clubState).toBeUndefined();
  });

  it("accepts valid clubState code", () => {
    const r = createCarClubSchema.safeParse({
      name: "Test Club Here",
      clubState: "ca",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.clubState).toBe("CA");
  });
});
