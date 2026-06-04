"use client";

import {
  Award,
  Car,
  ClipboardList,
  FileBarChart,
  Mail,
  Pencil,
} from "lucide-react";
import {
  PendingLink,
  PendingNavSpinner,
  usePendingNav,
} from "@/components/navigation/pending-navigation";
import { cn } from "@/lib/utils";

export type EventOrganizerNavTab =
  | "edit"
  | "registrations"
  | "vehicle-registrations"
  | "reports"
  | "messages"
  | "awards-judging";

type Props = {
  eventId: string;
  active: EventOrganizerNavTab;
  className?: string;
  /** When false, hides Vehicle Registrations (organizer / head judge / admin only). */
  showVehicleRegistrationsTab?: boolean;
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
    id: "vehicle-registrations",
    label: "Vehicle Registrations",
    href: (id) => `/organizer/events/${id}/vehicle-registrations`,
    icon: Car,
  },
  {
    id: "awards-judging",
    label: "Awards & Judging",
    href: (id) => `/organizer/events/${id}/awards-judging`,
    icon: Award,
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

export function EventOrganizerNav({
  eventId,
  active,
  className,
  showVehicleRegistrationsTab = false,
}: Props) {
  const tabs = showVehicleRegistrationsTab
    ? TABS
    : TABS.filter((t) => t.id !== "vehicle-registrations");

  return (
    <nav
      className={cn(
        "grid gap-1.5 rounded-lg border bg-card p-1.5 [grid-template-columns:repeat(auto-fit,minmax(6.5rem,1fr))]",
        className,
      )}
      aria-label="Event organizer sections"
    >
      {tabs.map(({ id, label, href, icon: Icon }) => {
        const isActive = id === active;
        return (
          <PendingLink
            key={id}
            href={href(eventId)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1.5 py-2 text-center text-[0.7rem] leading-snug font-medium transition-colors sm:min-h-[3.75rem] sm:px-2 sm:text-xs",
              isActive
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background hover:bg-muted",
            )}
          >
            <TabIcon icon={Icon} />
            <span>{label}</span>
          </PendingLink>
        );
      })}
    </nav>
  );
}
