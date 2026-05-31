"use client";

import { ClipboardList, FileBarChart, Mail, Pencil } from "lucide-react";
import {
  PendingLink,
  PendingNavSpinner,
  usePendingNav,
} from "@/components/navigation/pending-navigation";
import { cn } from "@/lib/utils";

export type EventOrganizerNavTab =
  | "edit"
  | "registrations"
  | "reports"
  | "messages";

type Props = {
  eventId: string;
  active: EventOrganizerNavTab;
  className?: string;
};

const TABS: {
  id: EventOrganizerNavTab;
  label: string;
  href: (eventId: string) => string;
  icon: typeof Pencil;
}[] = [
  {
    id: "edit",
    label: "Edit Event",
    href: (id) => `/organizer/events/${id}/edit`,
    icon: Pencil,
  },
  {
    id: "registrations",
    label: "Event Registrations",
    href: (id) => `/organizer/events/${id}/registrations`,
    icon: ClipboardList,
  },
  {
    id: "reports",
    label: "Reports",
    href: (id) => `/organizer/events/${id}/reports?report=voting`,
    icon: FileBarChart,
  },
  {
    id: "messages",
    label: "Event Messages",
    href: (id) => `/organizer/events/${id}/messages`,
    icon: Mail,
  },
];

function TabIcon({ icon: Icon }: { icon: typeof Pencil }) {
  const navigating = usePendingNav();
  if (navigating) {
    return <PendingNavSpinner className="size-3.5 sm:size-4" />;
  }
  return <Icon className="size-3.5 shrink-0 sm:size-4" aria-hidden />;
}

export function EventOrganizerNav({ eventId, active, className }: Props) {
  return (
    <nav
      className={cn(
        "flex gap-1 overflow-x-auto rounded-lg border bg-card p-1.5",
        className,
      )}
      aria-label="Event organizer sections"
    >
      {TABS.map(({ id, label, href, icon: Icon }) => {
        const isActive = id === active;
        return (
          <PendingLink
            key={id}
            href={href(eventId)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-xs transition-colors sm:gap-2 sm:px-3 sm:py-2 sm:text-sm",
              isActive
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background hover:bg-muted",
            )}
          >
            <TabIcon icon={Icon} />
            <span className="font-medium">{label}</span>
          </PendingLink>
        );
      })}
    </nav>
  );
}
