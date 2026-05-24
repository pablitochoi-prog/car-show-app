"use client";

import { CalendarPlus, Download, ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AddToCalendarLinks } from "@/lib/event-calendar";
import { cn } from "@/lib/utils";

type Props = {
  links: AddToCalendarLinks;
  className?: string;
  size?: "default" | "sm";
};

export function AddToCalendarMenu({
  links,
  className,
  size = "default",
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size }),
          "gap-2",
          className,
        )}
      >
        <CalendarPlus className="size-4" />
        Add to calendar
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-[13rem]">
        <DropdownMenuItem
          onClick={() => window.open(links.googleUrl, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink className="size-4" />
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => window.open(links.outlookUrl, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink className="size-4" />
          Outlook
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            window.location.href = links.icsUrl;
          }}
        >
          <Download className="size-4" />
          Download .ics file
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
