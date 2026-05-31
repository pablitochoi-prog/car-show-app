import { describe, expect, it } from "vitest";
import { addSmsOptInRequiresPhoneRefinement } from "./sms-notifications-consent";
import { z } from "zod";

describe("addSmsOptInRequiresPhoneRefinement", () => {
  const schema = z
    .object({
      smsNotificationsOptIn: z.boolean().optional(),
      phone: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      addSmsOptInRequiresPhoneRefinement(data, (d) => d.phone, "phone", ctx);
    });

  it("rejects SMS opt-in without phone", () => {
    const result = schema.safeParse({ smsNotificationsOptIn: true });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.message).toBe(
      "Enter a phone number to receive SMS notifications.",
    );
    expect(result.error.issues[0]?.path).toEqual(["phone"]);
  });

  it("accepts SMS opt-in with phone", () => {
    const result = schema.safeParse({
      smsNotificationsOptIn: true,
      phone: "(818) 555-0100",
    });
    expect(result.success).toBe(true);
  });

  it("accepts unchecked SMS without phone", () => {
    const result = schema.safeParse({ smsNotificationsOptIn: false });
    expect(result.success).toBe(true);
  });
});
