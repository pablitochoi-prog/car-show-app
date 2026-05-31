import type { StepUpOtpPurpose } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  STEP_UP_OTP_EXPIRY_MINUTES,
  STEP_UP_OTP_MAX_ATTEMPTS,
  STEP_UP_OTP_RESEND_COOLDOWN_SECONDS,
} from "@/lib/step-up-config";
import { generateOtpCode, hashOtpCode, verifyOtpCode } from "@/lib/step-up-crypto";

export type SendOtpResult =
  | { ok: true; expiresAt: Date; resendAvailableAt: Date }
  | { ok: false; reason: "RATE_LIMITED"; resendAvailableAt: Date }
  | { ok: false; reason: "EMAIL_NOT_VERIFIED" }
  | { ok: false; reason: "SEND_FAILED" };

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" | "EXPIRED" | "LOCKED" | "INVALID" };

export async function createAndSendOtpChallenge(input: {
  userId: string;
  purpose: StepUpOtpPurpose;
  sendEmail: (code: string, expiresAt: Date) => Promise<boolean>;
}): Promise<SendOtpResult> {
  const now = new Date();

  const prepared = await prisma.$transaction(async (tx) => {
    const active = await tx.stepUpOtpChallenge.findFirst({
      where: {
        userId: input.userId,
        purpose: input.purpose,
        consumedAt: null,
        expiresAt: { gt: now },
        emailSentAt: { not: null },
      },
      orderBy: { createdAt: "desc" },
    });

    if (active?.lastSentAt) {
      const cooldownMs = STEP_UP_OTP_RESEND_COOLDOWN_SECONDS * 1000;
      const resendAvailableAt = new Date(
        active.lastSentAt.getTime() + cooldownMs,
      );
      if (now.getTime() < resendAvailableAt.getTime()) {
        return {
          kind: "rate_limited" as const,
          resendAvailableAt,
        };
      }
    }

    await tx.stepUpOtpChallenge.updateMany({
      where: {
        userId: input.userId,
        purpose: input.purpose,
        consumedAt: null,
      },
      data: { consumedAt: now },
    });

    const code = generateOtpCode();
    const expiresAt = new Date(
      now.getTime() + STEP_UP_OTP_EXPIRY_MINUTES * 60 * 1000,
    );

    await tx.stepUpOtpChallenge.create({
      data: {
        userId: input.userId,
        purpose: input.purpose,
        codeHash: hashOtpCode(code),
        expiresAt,
        maxAttempts: STEP_UP_OTP_MAX_ATTEMPTS,
        lastSentAt: now,
      },
    });

    return { kind: "created" as const, code, expiresAt };
  });

  if (prepared.kind === "rate_limited") {
    return {
      ok: false,
      reason: "RATE_LIMITED",
      resendAvailableAt: prepared.resendAvailableAt,
    };
  }

  const sent = await input.sendEmail(prepared.code, prepared.expiresAt);
  if (!sent) {
    await prisma.stepUpOtpChallenge.updateMany({
      where: {
        userId: input.userId,
        purpose: input.purpose,
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    });
    return { ok: false, reason: "SEND_FAILED" };
  }

  await prisma.stepUpOtpChallenge.updateMany({
    where: {
      userId: input.userId,
      purpose: input.purpose,
      consumedAt: null,
      emailSentAt: null,
    },
    data: { emailSentAt: new Date() },
  });

  const resendAvailableAt = new Date(
    now.getTime() + STEP_UP_OTP_RESEND_COOLDOWN_SECONDS * 1000,
  );

  return {
    ok: true,
    expiresAt: prepared.expiresAt,
    resendAvailableAt,
  };
}

export async function verifyOtpChallenge(input: {
  userId: string;
  purpose: StepUpOtpPurpose;
  code: string;
}): Promise<VerifyOtpResult> {
  const now = new Date();
  const challenge = await prisma.stepUpOtpChallenge.findFirst({
    where: {
      userId: input.userId,
      purpose: input.purpose,
      consumedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  if (challenge.expiresAt <= now) {
    await prisma.stepUpOtpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: now },
    });
    return { ok: false, reason: "EXPIRED" };
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    return { ok: false, reason: "LOCKED" };
  }

  const valid = verifyOtpCode(input.code.trim(), challenge.codeHash);
  if (!valid) {
    const attempts = challenge.attempts + 1;
    await prisma.stepUpOtpChallenge.update({
      where: { id: challenge.id },
      data: {
        attempts,
        ...(attempts >= challenge.maxAttempts ? { consumedAt: now } : {}),
      },
    });
    return {
      ok: false,
      reason: attempts >= challenge.maxAttempts ? "LOCKED" : "INVALID",
    };
  }

  await prisma.stepUpOtpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: now },
  });

  return { ok: true };
}

export async function getOtpStatus(input: {
  userId: string;
  purpose: StepUpOtpPurpose;
}): Promise<{
  resendAvailableAt: Date | null;
  hasActiveChallenge: boolean;
  emailSent: boolean;
}> {
  const now = new Date();

  await prisma.stepUpOtpChallenge.updateMany({
    where: {
      userId: input.userId,
      purpose: input.purpose,
      consumedAt: null,
      emailSentAt: null,
      createdAt: { lt: new Date(now.getTime() - 2 * 60 * 1000) },
    },
    data: { consumedAt: now },
  });

  const challenge = await prisma.stepUpOtpChallenge.findFirst({
    where: {
      userId: input.userId,
      purpose: input.purpose,
      consumedAt: null,
      expiresAt: { gt: now },
      emailSentAt: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge?.lastSentAt || !challenge.emailSentAt) {
    return {
      resendAvailableAt: null,
      hasActiveChallenge: false,
      emailSent: false,
    };
  }

  const resendAt = new Date(
    challenge.lastSentAt.getTime() +
      STEP_UP_OTP_RESEND_COOLDOWN_SECONDS * 1000,
  );

  return {
    resendAvailableAt: resendAt > now ? resendAt : null,
    hasActiveChallenge: true,
    emailSent: true,
  };
}

/** Send a code when none is active, or when resend cooldown has elapsed. */
export async function deliverOrganizerOtpIfNeeded(input: {
  userId: string;
  purpose: StepUpOtpPurpose;
  sendEmail: (code: string, expiresAt: Date) => Promise<boolean>;
}): Promise<
  | { action: "sent"; result: Extract<SendOtpResult, { ok: true }> }
  | { action: "skipped"; reason: "active" | "rate_limited"; resendAvailableAt: Date | null }
  | { action: "failed"; reason: "SEND_FAILED" | "EMAIL_NOT_VERIFIED" }
> {
  const status = await getOtpStatus({
    userId: input.userId,
    purpose: input.purpose,
  });

  if (status.hasActiveChallenge) {
    return {
      action: "skipped",
      reason: "active",
      resendAvailableAt: status.resendAvailableAt,
    };
  }

  const result = await createAndSendOtpChallenge(input);

  if (result.ok) {
    return { action: "sent", result };
  }

  if (result.reason === "RATE_LIMITED") {
    return {
      action: "skipped",
      reason: "rate_limited",
      resendAvailableAt: result.resendAvailableAt,
    };
  }

  if (result.reason === "EMAIL_NOT_VERIFIED") {
    return { action: "failed", reason: "EMAIL_NOT_VERIFIED" };
  }

  return { action: "failed", reason: "SEND_FAILED" };
}
