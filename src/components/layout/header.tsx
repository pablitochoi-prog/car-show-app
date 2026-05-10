"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Car, LogIn, UserPlus, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlatformRole } from "@/types";
import { isOrganizerOrAbove } from "@/lib/permissions";

interface HeaderProps {
  user?: { name: string; email: string; platformRole?: PlatformRole } | null;
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const showOrganizerLinks = user?.platformRole
    ? isOrganizerOrAbove({ platformRole: user.platformRole })
    : false;

  /** Organizer tools: dashboard Events (Managing) or legacy `/organizer/*` routes. */
  const organizerToolsActive =
    pathname.startsWith("/dashboard/events") ||
    pathname.startsWith("/organizer");
  const eventsActive = pathname.startsWith("/events");
  const dashboardActive = pathname.startsWith("/dashboard");

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      // Even if the API call fails, redirect to login
    }
    window.location.assign("/login");
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="layout-bar h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <Car className="h-6 w-6" />
          <span>CarShowApp</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-2 md:flex">
          {user ? (
            <div className="flex items-center gap-2">
              {showOrganizerLinks && (
                <Link
                  href="/dashboard/events"
                  className={cn(
                    buttonVariants({
                      variant: organizerToolsActive ? "default" : "outline",
                      size: "sm",
                    })
                  )}
                >
                  Create/Edit Event
                </Link>
              )}
              <Link
                href="/events"
                className={cn(
                  buttonVariants({
                    variant: eventsActive ? "default" : "outline",
                    size: "sm",
                  })
                )}
              >
                Find Events
              </Link>
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({
                    variant: dashboardActive ? "default" : "outline",
                    size: "sm",
                  })
                )}
              >
                Dashboard
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={loggingOut}
                onClick={handleLogout}
                className="ml-1 text-muted-foreground"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/events"
                className={cn(
                  buttonVariants({
                    variant: eventsActive ? "default" : "outline",
                    size: "sm",
                  })
                )}
              >
                Find Events
              </Link>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  <LogIn className="mr-2 h-4 w-4" />
                  Log In
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile Navigation */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <nav className="mt-8 flex flex-col gap-3">
              {user ? (
                <>
                  {showOrganizerLinks && (
                    <Link
                      href="/dashboard/events"
                      onClick={() => setOpen(false)}
                      className={cn(
                        buttonVariants({
                          variant: organizerToolsActive ? "default" : "outline",
                          size: "default",
                        }),
                        "w-full justify-center text-center"
                      )}
                    >
                      Create/Edit Event
                    </Link>
                  )}
                  <Link
                    href="/events"
                    onClick={() => setOpen(false)}
                    className={cn(
                      buttonVariants({
                        variant: eventsActive ? "default" : "outline",
                        size: "default",
                      }),
                      "w-full justify-center text-center"
                    )}
                  >
                    Find Events
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className={cn(
                      buttonVariants({
                        variant: dashboardActive ? "default" : "outline",
                        size: "default",
                      }),
                      "w-full justify-center text-center"
                    )}
                  >
                    Dashboard
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    disabled={loggingOut}
                    onClick={() => {
                      void handleLogout();
                      setOpen(false);
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    href="/events"
                    onClick={() => setOpen(false)}
                    className={cn(
                      buttonVariants({
                        variant: eventsActive ? "default" : "outline",
                        size: "default",
                      }),
                      "w-full justify-center text-center"
                    )}
                  >
                    Find Events
                  </Link>
                  <Link href="/login" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Log In
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={() => setOpen(false)}>
                    <Button className="w-full">Sign Up</Button>
                  </Link>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
