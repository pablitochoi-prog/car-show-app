"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import {
  createContext,
  useContext,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const PendingNavContext = createContext(false);

function usePendingNav() {
  return useContext(PendingNavContext);
}

/** Spinner shown inside a `<PendingLink>` — also tracks Next.js link pending state. */
export function PendingNavSpinner({ className }: { className?: string }) {
  const navigating = usePendingNav();
  const { pending } = useLinkStatus();
  if (!navigating && !pending) return null;

  return (
    <Loader2
      className={cn("shrink-0 animate-spin", className)}
      aria-hidden
    />
  );
}

type PendingLinkProps = Omit<ComponentProps<typeof Link>, "onClick"> & {
  children: ReactNode;
  /** Applied while navigation is in progress (after click, until route change). */
  pendingClassName?: string;
};

/**
 * Next.js link that disables repeat clicks and shows busy state while navigating.
 * Place `<PendingNavSpinner />` inside children where you want the icon.
 */
export function PendingLink({
  children,
  className,
  pendingClassName,
  ...props
}: PendingLinkProps) {
  const [navigating, setNavigating] = useState(false);

  return (
    <PendingNavContext.Provider value={navigating}>
      <Link
        {...props}
        aria-busy={navigating || undefined}
        onClick={() => setNavigating(true)}
        className={cn(
          className,
          navigating && "pointer-events-none opacity-80",
          navigating && pendingClassName,
        )}
      >
        {children}
      </Link>
    </PendingNavContext.Provider>
  );
}

export { usePendingNav };
