"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, LogIn } from "lucide-react";

export function InlineLogin({ redirectPath }: { redirectPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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
        setError(data.error || "Login failed.");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const signupHref = `/signup?redirect=${encodeURIComponent(redirectPath)}`;

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 text-center">
        <p className="text-sm font-medium">
          Already have an account?{" "}
          <span className="text-muted-foreground">
            Log in to pre-fill your info.
          </span>
        </p>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="inline-email" className="text-xs">
              Email
            </Label>
            <Input
              id="inline-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inline-password" className="text-xs">
              Password
            </Label>
            <Input
              id="inline-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-9"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" disabled={loading} className="gap-1.5">
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogIn className="size-4" />
            )}
            Log in
          </Button>
          <span className="text-sm text-muted-foreground">
            No account?{" "}
            <Link
              href={signupHref}
              className="font-medium text-primary hover:underline"
            >
              Sign up
            </Link>
          </span>
          <Link
            href="/forgot-password"
            className="ml-auto text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      </form>
    </div>
  );
}
