import { prisma } from "@/lib/db";
import type { StepUpAuditAction, StepUpOtpPurpose } from "@prisma/client";

export async function writeStepUpAuditLog(input: {
  userId: string;
  purpose: StepUpOtpPurpose;
  action: StepUpAuditAction;
  eventId?: string | null;
  route?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    await prisma.stepUpAuditLog.create({
      data: {
        userId: input.userId,
        purpose: input.purpose,
        action: input.action,
        eventId: input.eventId ?? null,
        route: input.route ?? null,
        ip: input.ip?.slice(0, 64) ?? null,
        userAgent: input.userAgent?.slice(0, 256) ?? null,
      },
    });
  } catch (e) {
    console.error("[step-up-audit]", input.action, e);
  }
}
