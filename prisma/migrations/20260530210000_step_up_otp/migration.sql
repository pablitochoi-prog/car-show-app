-- CreateEnum
CREATE TYPE "StepUpOtpPurpose" AS ENUM ('ORGANIZER_STEP_UP');

-- CreateEnum
CREATE TYPE "StepUpAuditAction" AS ENUM ('OTP_REQUESTED', 'OTP_VERIFIED', 'OTP_FAILED', 'OTP_EXPIRED', 'OTP_RATE_LIMITED', 'ACCESS_DENIED');

-- CreateTable
CREATE TABLE "step_up_otp_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "StepUpOtpPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "consumedAt" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "step_up_otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "step_up_audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT,
    "purpose" "StepUpOtpPurpose" NOT NULL,
    "action" "StepUpAuditAction" NOT NULL,
    "route" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "step_up_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "step_up_otp_challenges_userId_purpose_consumedAt_idx" ON "step_up_otp_challenges"("userId", "purpose", "consumedAt");

-- CreateIndex
CREATE INDEX "step_up_audit_logs_userId_createdAt_idx" ON "step_up_audit_logs"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "step_up_otp_challenges" ADD CONSTRAINT "step_up_otp_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_up_audit_logs" ADD CONSTRAINT "step_up_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
