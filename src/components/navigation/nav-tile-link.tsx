"use client";

import {
  Calendar,
  Car,
  MessageSquare,
  ShieldCheck,
  Tag,
  Trophy,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode } from "react";
import {
  PendingLink,
  PendingNavSpinner,
} from "@/components/navigation/pending-navigation";
import { cn } from "@/lib/utils";

const NAV_TILE_ICONS = {
  calendar: Calendar,
  car: Car,
  trophy: Trophy,
  users: Users,
  "user-circle": UserCircle,
  "shield-check": ShieldCheck,
  "message-square": MessageSquare,
  tag: Tag,
} as const satisfies Record<string, LucideIcon>;

export type NavTileIconName = keyof typeof NAV_TILE_ICONS;

/** Dashboard-style tile link with spinner feedback while navigation is in progress. */
export function NavTileLink({
  href,
  title,
  description,
  icon,
  className,
  titleExtra,
}: {
  href: string;
  title: string;
  description: string;
  /** Serializable icon key — do not pass Lucide components from Server Components. */
  icon: NavTileIconName;
  className?: string;
  titleExtra?: ReactNode;
}) {
  const Icon = NAV_TILE_ICONS[icon];

  return (
    <PendingLink
      href={href}
      className={cn(
        "relative flex flex-col rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm",
        "transition-colors hover:bg-accent/45 hover:border-primary/35",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <PendingNavSpinner className="absolute right-4 top-4 size-5 text-primary" />
      <div className="flex flex-row items-start gap-3">
        <Icon className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold leading-snug tracking-tight">
              {title}
            </h2>
            {titleExtra}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </PendingLink>
  );
}
