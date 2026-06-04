"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import {
  authAlertError,
  authAlertSuccess,
  authCardClass,
  authInputClass,
  authLogoWrapClass,
  authPrimaryButtonClass,
} from "@/lib/auth-ui";
import { cn } from "@/lib/utils";
import { clearSessionActivityLocalStorage } from "@/lib/session-idle-client";
import { AlertCircle, CheckCircle2, Car, Loader2 } from "lucide-react";

function safeRedirect(path: string | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/dashboard";
  return path;
}

export function LoginForm({
  redirectTo,
  authError,
  successMessage,
}: {
  redirectTo?: string;
  authError?: string;
  successMessage?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(authError ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed. Please try again.");
        return;
      }

      const destination = safeRedirect(redirectTo);

      if (data.mfaRequired) {
        clearSessionActivityLocalStorage();
        window.location.assign(
          `/login/mfa?redirect=${encodeURIComponent(destination)}`,
        );
        return;
      }

      clearSessionActivityLocalStorage();
      window.location.assign(destination);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const signupHref =
    redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? `/signup?redirect=${encodeURIComponent(redirectTo)}`
      : "/signup";

  return (
    <AuthPageShell>
      <Card className={cn(authCardClass)}>
        <CardHeader className="space-y-4 px-6 pb-2 text-center sm:px-8">
          <div className={authLogoWrapClass}>
            <Car className="h-7 w-7 text-primary" aria-hidden />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
              Welcome back
            </CardTitle>
            <CardDescription className="text-[15px] leading-relaxed">
              Log in to your CarShowApp account
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5 px-6 sm:px-8">
            {successMessage && (
              <div role="status" className={authAlertSuccess()}>
                <CheckCircle2 aria-hidden />
                <span>{successMessage}</span>
              </div>
            )}
            {error && (
              <div role="alert" className={authAlertError()}>
                <AlertCircle aria-hidden />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={authInputClass}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-primary/90 underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className={authInputClass}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-5 border-border/60 px-6 pt-2 pb-6 sm:px-8">
            <Button
              type="submit"
              size="lg"
              className={cn("w-full", authPrimaryButtonClass)}
              disabled={loading}
            >
              {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Log in
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href={signupHref}
                className="font-medium text-primary underline-offset-4 transition-colors hover:text-primary/90 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
              >
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </AuthPageShell>
  );
}
