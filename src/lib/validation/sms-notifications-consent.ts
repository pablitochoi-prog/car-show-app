import { z } from "zod";

export const smsNotificationsOptInFieldSchema = z.boolean().optional().default(false);

export function addSmsOptInRequiresPhoneRefinement<T extends {
  smsNotificationsOptIn?: boolean;
}>(
  data: T,
  getPhone: (data: T) => string | null | undefined,
  phonePath: string,
  ctx: z.RefinementCtx,
): void {
  if (data.smsNotificationsOptIn && !getPhone(data)?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter a phone number to receive SMS notifications.",
      path: [phonePath],
    });
  }
}
