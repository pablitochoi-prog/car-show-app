import { describe, expect, it } from "vitest";
import { normalizeProfilePayload, updateProfileSchema } from "./profile";

describe("updateProfileSchema", () => {
  it("accepts masked phone and trims names", () => {
    const parsed = updateProfileSchema.safeParse({
      firstName: "  Jane ",
      lastName: " Doe ",
      birthYear: 1990,
      phone: "(555) 123-4567",
      street: " 1 Main ",
      city: "Town",
      state: "NJ",
      zip: "07001",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const n = normalizeProfilePayload(parsed.data);
    expect(n.firstName).toBe("Jane");
    expect(n.lastName).toBe("Doe");
    expect(n.birthYear).toBe(1990);
    expect(n.phone).toBe("(555) 123-4567");
    expect(n.street).toBe("1 Main");
    expect(n.displayName).toBe("Jane Doe");
  });

  it("allows blank phone", () => {
    const parsed = updateProfileSchema.safeParse({
      firstName: "A",
      lastName: "B",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(normalizeProfilePayload(parsed.data).phone).toBeNull();
  });

  it("requires phone when SMS opt-in is checked", () => {
    const parsed = updateProfileSchema.safeParse({
      firstName: "A",
      lastName: "B",
      smsNotificationsOptIn: true,
    });
    expect(parsed.success).toBe(false);
  });
});
