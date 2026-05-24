"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CollapsibleCard({
  title,
  badge,
  defaultOpen = false,
  keepMounted = false,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  /** When true, children stay mounted while collapsed (hidden) so client data can load. */
  keepMounted?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none transition-colors hover:bg-accent/40"
        onClick={() => setOpen((o) => !o)}
        role="button"
        aria-expanded={open}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown className="size-5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
          )}
          <CardTitle className="text-lg">{title}</CardTitle>
          {badge ? <div className="ml-auto shrink-0">{badge}</div> : null}
        </div>
      </CardHeader>
      {keepMounted ? (
        <CardContent className={open ? undefined : "hidden"}>{children}</CardContent>
      ) : (
        open && <CardContent>{children}</CardContent>
      )}
    </Card>
  );
}
