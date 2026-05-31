import { describe, expect, it } from "vitest";
import {
  guestRegisterSchema,
  registerForEventSchema,
} from "./registration";

describe("registerForEventSchema SMS consent", () => {
  const validContact = {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    street: "1 Main St",
    city: "Town",
    state: "CA",
    zip: "90210",
  };

  const validBase = {
    tierId: "00000000-0000-4000-8000-000000000001",
    contact: validContact,
    vehicleIds: ["00000000-0000-4000-8000-000000000002"],
  };

  it("requires contact phone when SMS opt-in is checked", () => {
    const result = registerForEventSchema.safeParse({
      ...validBase,
      smsNotificationsOptIn: true,
    });
    expect(result.success).toBe(false);
  });

  it("accepts SMS opt-in with contact phone", () => {
    const result = registerForEventSchema.safeParse({
      ...validBase,
      contact: { ...validContact, phone: "(818) 555-0100" },
      smsNotificationsOptIn: true,
    });
    expect(result.success).toBe(true);
  });

  it("defaults SMS opt-in to false", () => {
    const result = registerForEventSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.smsNotificationsOptIn).toBe(false);
  });
});

describe("guestRegisterSchema SMS consent", () => {
  const validBase = {
    tierId: "00000000-0000-4000-8000-000000000001",
    firstName: "Guest",
    lastName: "User",
    email: "guest@example.com",
    street: "1 Main St",
    city: "Town",
    state: "CA",
    zip: "90210",
    vehicles: [
      {
        year: 1969,
        make: "Ford",
        model: "Mustang",
      },
    ],
  };

  it("requires phone when SMS opt-in is checked", () => {
    const result = guestRegisterSchema.safeParse({
      ...validBase,
      smsNotificationsOptIn: true,
    });
    expect(result.success).toBe(false);
  });

  it("accepts SMS opt-in with phone", () => {
    const result = guestRegisterSchema.safeParse({
      ...validBase,
      phone: "(818) 555-0100",
      smsNotificationsOptIn: true,
    });
    expect(result.success).toBe(true);
  });
});
