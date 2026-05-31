import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMfaSessionState } from "@/lib/mfa-session";
import { getAdminMfaGuardState } from "@/lib/admin-mfa-guards";

export async function AdminMfaWarningBanner() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const mfa = await getMfaSessionState(supabase);
  const guard = getAdminMfaGuardState(user, mfa);

  if (!guard.showMfaSetupWarning) return null;

  return (
    <div
      className="mb-4 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
      role="status"
    >
      <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
      <p>
        <span className="font-medium">Admin MFA is not enabled.</span> Please
        enable it in{" "}
        <Link href="/dashboard/security" className="font-medium underline">
          Account → Security
        </Link>
        .
      </p>
    </div>
  );
}
