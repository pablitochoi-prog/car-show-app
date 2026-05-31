import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

function tryDecodeAuthMessage(raw: string): string {
  try {
    return decodeURIComponent(raw.replace(/\+/g, " "));
  } catch {
    return raw;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    redirect?: string;
    code?: string;
    error?: string;
    error_description?: string;
    reset?: string;
    reason?: string;
  }>;
}) {
  const sp = await searchParams;

  if (typeof sp.code === "string" && sp.code.length > 0) {
    const next =
      typeof sp.redirect === "string" &&
      sp.redirect.startsWith("/") &&
      !sp.redirect.startsWith("//")
        ? sp.redirect
        : "/dashboard";
    redirect(
      `/auth/callback?code=${encodeURIComponent(sp.code)}&next=${encodeURIComponent(next)}`
    );
  }

  const rawError =
    (typeof sp.error_description === "string" && sp.error_description) ||
    (typeof sp.error === "string" && sp.error) ||
    undefined;
  const authError = rawError ? tryDecodeAuthMessage(rawError) : undefined;

  const resetSuccess = sp.reset === "success";
  const idleLogout = sp.reason === "idle";

  return (
    <LoginForm
      redirectTo={sp.redirect}
      authError={authError}
      successMessage={
        idleLogout
          ? "You were signed out due to inactivity."
          : resetSuccess
            ? "Password updated. You can log in with your new password."
            : undefined
      }
    />
  );
}
