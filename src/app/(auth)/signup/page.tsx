"use client";

import { useState } from "react";
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
import {
  AlertCircle,
  Car,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { SIGNUP_PASSWORD_MISMATCH_MESSAGE } from "@/lib/validation/auth";
import { UsPhoneInput } from "@/components/inputs/us-phone-input";
import { cn } from "@/lib/utils";

const SIGNUP_SUCCESS_TITLE = "Account Created Successfully";
const SIGNUP_SUCCESS_BODY =
  "Your account has been created successfully.\nPlease check your email and click the verification link to activate your account.";
const SIGNUP_SUCCESS_NOTE =
  "Didn't receive the email? Check your spam folder or request a new verification link.";

const USERNAME_TAKEN_TITLE = "Username already taken";
const USERNAME_TAKEN_MESSAGE =
  "That username is already in use. Please choose a different username.";

const dialogSheetClass =
  "max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-2xl shadow-black/20 ring-1 ring-black/[0.06] dark:shadow-black/50 dark:ring-white/[0.08] sm:p-8";

function UsernameTakenDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="username-taken-title"
        aria-describedby="username-taken-desc"
        className={dialogSheetClass}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="username-taken-title"
          className="mb-2 text-lg font-semibold tracking-tight text-foreground"
        >
          {USERNAME_TAKEN_TITLE}
        </h2>
        <p id="username-taken-desc" className="mb-6 text-sm leading-relaxed text-muted-foreground">
          {USERNAME_TAKEN_MESSAGE}
        </p>
        <Button
          type="button"
          size="lg"
          className={cn("w-full", authPrimaryButtonClass)}
          onClick={onClose}
        >
          OK
        </Button>
      </div>
    </div>
  );
}

function PasswordMismatchDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pw-mismatch-title"
        aria-describedby="pw-mismatch-desc"
        className={dialogSheetClass}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="pw-mismatch-title"
          className="mb-2 text-lg font-semibold tracking-tight text-foreground"
        >
          Passwords don&apos;t match
        </h2>
        <p id="pw-mismatch-desc" className="mb-6 text-sm leading-relaxed text-muted-foreground">
          {SIGNUP_PASSWORD_MISMATCH_MESSAGE}
        </p>
        <Button
          type="button"
          size="lg"
          className={cn("w-full", authPrimaryButtonClass)}
          onClick={onClose}
        >
          OK
        </Button>
      </div>
    </div>
  );
}

function FormSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <p className={authSectionLabelClass}>{label}</p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function PasswordFieldWithToggle({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete={autoComplete}
          className={cn(authInputClass, "pr-11")}
          disabled={disabled}
        />
        <button
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55 disabled:pointer-events-none"
          onClick={onToggleShow}
          disabled={disabled}
        >
          {show ? (
            <EyeOff className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <Eye className="h-4 w-4 shrink-0" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}

export default function SignupPage() {
  const [phase, setPhase] = useState<"form" | "success">("form");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mismatchOpen, setMismatchOpen] = useState(false);
  const [usernameTakenOpen, setUsernameTakenOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMismatchOpen(false);
    setUsernameTakenOpen(false);

    if (password !== confirmPassword) {
      setMismatchOpen(true);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
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

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "USERNAME_TAKEN") {
          setUsernameTakenOpen(true);
          return;
        }
        if (data.error === SIGNUP_PASSWORD_MISMATCH_MESSAGE) {
          setMismatchOpen(true);
          return;
        }
        setError(data.error || "Signup failed. Please try again.");
        return;
      }

      if (data.requiresEmailVerification === true) {
        setPhase("success");
        return;
      }

      window.location.assign("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (phase === "success") {
    return (
      <AuthPageShell>
        <Card className={cn(authCardClass)}>
          <CardHeader className="space-y-4 px-6 pb-2 text-center sm:px-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-500/25">
              <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" aria-hidden />
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
              {SIGNUP_SUCCESS_TITLE}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-6 text-center text-sm sm:px-8">
            <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
              {SIGNUP_SUCCESS_BODY}
            </p>
            <p className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-left text-muted-foreground">
              {SIGNUP_SUCCESS_NOTE}
            </p>
            {process.env.NODE_ENV === "development" ? (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left text-xs leading-relaxed text-amber-950 dark:text-amber-100">
                <strong className="font-medium">Local development:</strong> The email link points at
                your app URL (see{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                  NEXT_PUBLIC_APP_URL
                </code>
                ). If it uses{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                  localhost
                </code>
                , open the link on the same computer where the dev server runs—not on your phone.
                To verify from a phone, set{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                  NEXT_PUBLIC_APP_URL
                </code>{" "}
                to your Mac&apos;s LAN address and add that URL to Supabase redirect allowlist (see{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                  .env.example
                </code>
                ).
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col gap-2 px-6 pb-6 sm:px-8">
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: "lg", variant: "default" }),
                "w-full justify-center text-center",
                authPrimaryButtonClass
              )}
            >
              Go to log in
            </Link>
          </CardFooter>
        </Card>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <UsernameTakenDialog
        open={usernameTakenOpen}
        onClose={() => setUsernameTakenOpen(false)}
      />
      <PasswordMismatchDialog
        open={mismatchOpen}
        onClose={() => setMismatchOpen(false)}
      />
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
              Join CarShowApp to discover events and register your vehicles
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-8 px-6 sm:px-8">
            {error && (
              <div role="alert" className={authAlertError()}>
                <AlertCircle aria-hidden />
                <span>{error}</span>
              </div>
            )}
            <FormSection label="Profile">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Username (*)
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="e.g., Cool_Driver_42"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  spellCheck={false}
                  disabled={loading}
                  className={authInputClass}
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  3–30 characters: letters, numbers, and underscores only. Choose a unique username
                  (example above is not reserved).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email (*)
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={loading}
                  className={authInputClass}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">
                    First name (*)
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoComplete="given-name"
                    disabled={loading}
                    className={authInputClass}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">
                    Last name (*)
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    autoComplete="family-name"
                    disabled={loading}
                    className={authInputClass}
                  />
                </div>
              </div>
            </FormSection>

            <FormSection label="Security">
              <div className="space-y-2">
                <PasswordFieldWithToggle
                  id="password"
                  label="Password (*)"
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  onToggleShow={() => setShowPassword((v) => !v)}
                  autoComplete="new-password"
                  disabled={loading}
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  At least 8 characters, one capital letter, and one special character.
                </p>
              </div>
              <PasswordFieldWithToggle
                id="confirmPassword"
                label="Confirm password (*)"
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showConfirm}
                onToggleShow={() => setShowConfirm((v) => !v)}
                autoComplete="new-password"
                disabled={loading}
              />
            </FormSection>

            <FormSection label="Contact">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone (optional)
                </Label>
                <UsPhoneInput
                  id="phone"
                  value={phone}
                  onChange={setPhone}
                  disabled={loading}
                  className={authInputClass}
                />
              </div>
            </FormSection>
          </CardContent>
          <CardFooter className="flex flex-col gap-5 border-border/60 px-6 pt-2 pb-6 sm:px-8">
            <Button
              type="submit"
              size="lg"
              className={cn("w-full", authPrimaryButtonClass)}
              disabled={loading}
            >
              {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Create account
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-primary underline-offset-4 transition-colors hover:text-primary/90 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
              >
                Log in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </AuthPageShell>
  );
}
