import type { MfaSessionState } from "@/lib/mfa-session";
import { isSiteAdmin, type PermUser } from "@/lib/permissions";

export type AdminMfaGuardState = {
  isAdmin: boolean;
  mfaEnrolled: boolean;
  mfaVerifiedForSession: boolean;
  needsMfaChallenge: boolean;
  showMfaSetupWarning: boolean;
};

export function getAdminMfaGuardState(
  user: Pick<PermUser, "platformRole"> | null,
  mfa: MfaSessionState,
): AdminMfaGuardState {
  const isAdmin = user ? isSiteAdmin(user) : false;

  if (!isAdmin) {
    return {
      isAdmin: false,
      mfaEnrolled: false,
      mfaVerifiedForSession: false,
      needsMfaChallenge: false,
      showMfaSetupWarning: false,
    };
  }

  const mfaEnrolled = mfa.hasVerifiedTotp;
  const mfaVerifiedForSession = mfa.currentLevel === "aal2";
  const needsMfaChallenge = mfaEnrolled && mfa.needsMfaVerification;
  const showMfaSetupWarning = !mfaEnrolled;

  return {
    isAdmin: true,
    mfaEnrolled,
    mfaVerifiedForSession,
    needsMfaChallenge,
    showMfaSetupWarning,
  };
}

export function adminRouteRequiresMfaChallenge(guard: AdminMfaGuardState): boolean {
  return guard.isAdmin && guard.mfaEnrolled && guard.needsMfaChallenge;
}
