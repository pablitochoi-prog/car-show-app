"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  active: boolean;
  label: string;
  description: string;
  count?: number;
};

export function EventsTabLink({
  href,
  active,
  label,
  description,
  count,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-busy={pending || undefined}
      onClick={(e) => {
        if (active) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        startTransition(() => {
          router.push(href);
        });
      }}
      className={cn(
        buttonVariants({
          variant: active ? "default" : "outline",
          size: "sm",
        }),
        "h-auto min-w-0 flex-1 flex-col gap-0.5 py-2.5 sm:flex-none sm:min-w-[10rem] sm:px-4",
        pending && "pointer-events-none",
      )}
    >
      <span className="inline-flex w-full items-center justify-center gap-1.5 sm:justify-start">
        {pending ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
        ) : null}
        <span>{label}</span>
        {count != null && count > 0 ? (
          <span
            className={cn(
              "rounded-md px-1.5 py-px text-[11px] font-normal tabular-nums",
              active
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {count}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "block w-full text-center text-[11px] font-normal sm:text-left sm:text-xs",
          active ? "text-primary-foreground/85" : "text-muted-foreground",
        )}
      >
        {description}
      </span>
    </Link>
  );
}
