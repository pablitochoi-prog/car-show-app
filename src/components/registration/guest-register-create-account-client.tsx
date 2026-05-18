"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
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
  authCardClass,
  authInputClass,
  authLogoWrapClass,
  authPrimaryButtonClass,
  authSectionLabelClass,
} from "@/lib/auth-ui";
import { AlertCircle, Car, Eye, EyeOff, Loader2 } from "lucide-react";
import { SIGNUP_PASSWORD_MISMATCH_MESSAGE } from "@/lib/validation/auth";
import { UsPhoneInput } from "@/components/inputs/us-phone-input";
import { cn } from "@/lib/utils";

export function GuestRegisterCreateAccountClient({
  eventId,
}: {
  eventId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registrationId = searchParams.get("registrationId") ?? "";
  const needsCheckout = searchParams.get("checkout") === "1";
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState(
    () => searchParams.get("firstName") ?? "",
  );
  const [lastName, setLastName] = useState(
    () => searchParams.get("lastName") ?? "",
  );
  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [phone, setPhone] = useState(() => searchParams.get("phone") ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!registrationId) {
      setError("Missing registration. Please start guest registration again.");
    }
  }, [registrationId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!registrationId) {
      setError("Missing registration. Please start guest registration again.");
      return;
    }

    if (password !== confirmPassword) {
      setError(SIGNUP_PASSWORD_MISMATCH_MESSAGE);
      return;
    }

    setLoading(true);
    try {
      const signupRes = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          firstName,
          lastName,
          email,
          password,
          confirmPassword,
          phone: phone.trim() ? phone : undefined,
        }),
      });
      const signupData = (await signupRes.json()) as {
        error?: string;
        code?: string;
        requiresEmailVerification?: boolean;
      };

      if (!signupRes.ok) {
        setError(signupData.error ?? "Could not create account.");
        return;
      }

      if (signupData.requiresEmailVerification) {
        setError(
          "Check your email to verify your account, then log in to complete payment for this registration.",
        );
        return;
      }

      const claimRes = await fetch(
        `/api/registrations/${registrationId}/claim`,
        { method: "POST", credentials: "include" },
      );
      const claimData = (await claimRes.json()) as { error?: string };
      if (!claimRes.ok) {
        setError(claimData.error ?? "Could not link registration to your account.");
        return;
      }

      if (needsCheckout) {
        const checkoutRes = await fetch("/api/stripe/checkout", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registrationId }),
        });
        const checkoutData = (await checkoutRes.json()) as {
          checkoutUrl?: string;
          error?: string;
        };

        if (!checkoutRes.ok || !checkoutData.checkoutUrl) {
          router.push(
            `/events/${eventId}/register/checkout-canceled?registration_id=${registrationId}`,
          );
          return;
        }

        window.location.href = checkoutData.checkoutUrl;
        return;
      }

      router.push(`/events/${eventId}/register/success?status=CONFIRMED`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell>
      <Card className={cn(authCardClass)}>
        <CardHeader className="space-y-4 px-6 pb-2 text-center sm:px-8">
          <div className={authLogoWrapClass}>
            <Car className="h-7 w-7 text-primary" aria-hidden />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
              Create your account
            </CardTitle>
            <CardDescription className="text-[15px] leading-relaxed">
              Your registration is saved. Create an account to continue to
              secure payment.
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <CardContent className="space-y-6 px-6 sm:px-8">
            {error && (
              <div role="alert" className={authAlertError()}>
                <AlertCircle aria-hidden />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-4">
              <p className={authSectionLabelClass}>Profile</p>
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                  className={authInputClass}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={loading}
                    className={authInputClass}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    disabled={loading}
                    className={authInputClass}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className={authInputClass}
                />
              </div>
            </div>
            <div className="space-y-4">
              <p className={authSectionLabelClass}>Security</p>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className={cn(authInputClass, "pr-11")}
                  />
                  <button
                    type="button"
                    className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    className={cn(authInputClass, "pr-11")}
                  />
                  <button
                    type="button"
                    className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={
                      showConfirm ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirm ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <UsPhoneInput
                id="phone"
                value={phone}
                onChange={setPhone}
                disabled={loading}
                className={authInputClass}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 border-border/60 px-6 pb-6 sm:px-8">
            <Button
              type="submit"
              size="lg"
              className={cn("w-full", authPrimaryButtonClass)}
              disabled={loading || !registrationId}
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {needsCheckout ? "Create account & pay" : "Create account & finish"}
            </Button>
            <Link
              href={`/events/${eventId}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "w-full justify-center",
              )}
            >
              Back to event registration
            </Link>
          </CardFooter>
        </form>
      </Card>
    </AuthPageShell>
  );
}
