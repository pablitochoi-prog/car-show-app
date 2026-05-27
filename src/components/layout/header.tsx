"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogIn, UserPlus, LogOut, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlatformRole } from "@/types";
import { useUnreadMessages } from "@/components/messages/unread-messages-provider";
import { UnreadCountBadge } from "@/components/messages/unread-count-badge";
import { SiteLogo } from "@/components/brand/site-logo";

interface HeaderProps {
  isLoggedIn?: boolean;
  user?: { name: string; email: string; platformRole?: PlatformRole } | null;
}

export function Header({ isLoggedIn = false }: HeaderProps) {
  const { unreadCount: unreadMessageCount } = useUnreadMessages();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const eventsActive = pathname.startsWith("/events");
  const dashboardActive = pathname.startsWith("/dashboard");
  const messagesActive = pathname.startsWith("/dashboard/messages");
  const hasUnreadMessages = unreadMessageCount > 0;

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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden">
      <div className="layout-bar h-20 items-center justify-between">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 py-1"
          aria-label="CarShowScout.com home"
        >
          <SiteLogo size="header" priority />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-2 md:flex">
          <div className="flex items-center gap-2">
            <Link
              href="/events"
              className={cn(
                buttonVariants({
                  variant: eventsActive ? "default" : "outline",
                  size: "sm",
                }),
              )}
            >
              Find Events
            </Link>
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className={cn(
                    buttonVariants({
                      variant:
                        dashboardActive && !messagesActive ? "default" : "outline",
                      size: "sm",
                    }),
                  )}
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/messages"
                  className={cn(
                    buttonVariants({
                      variant: hasUnreadMessages ? "default" : "outline",
                      size: "sm",
                    }),
                    "relative inline-flex items-center gap-1.5",
                    !hasUnreadMessages && "bg-background",
                  )}
                >
                  <MessageSquare className="size-3.5 shrink-0" aria-hidden />
                  Messages
                  <UnreadCountBadge
                    count={unreadMessageCount}
                    onPrimary={hasUnreadMessages}
                  />
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
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </nav>

        {/* Mobile Navigation */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <nav className="mt-8 flex flex-col gap-3">
              <Link
                href="/events"
                onClick={() => setOpen(false)}
                className={cn(
                  buttonVariants({
                    variant: eventsActive ? "default" : "outline",
                    size: "default",
                  }),
                  "w-full justify-center text-center",
                )}
              >
                Find Events
              </Link>
              {isLoggedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className={cn(
                      buttonVariants({
                        variant:
                          dashboardActive && !messagesActive ? "default" : "outline",
                        size: "default",
                      }),
                      "w-full justify-center text-center",
                    )}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/dashboard/messages"
                    onClick={() => setOpen(false)}
                    className={cn(
                      buttonVariants({
                        variant: hasUnreadMessages ? "default" : "outline",
                        size: "default",
                      }),
                      "inline-flex w-full items-center justify-center gap-2 text-center",
                      !hasUnreadMessages && "bg-background",
                    )}
                  >
                    <MessageSquare className="size-4 shrink-0" aria-hidden />
                    Messages
                    <UnreadCountBadge
                      count={unreadMessageCount}
                      onPrimary={hasUnreadMessages}
                    />
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
