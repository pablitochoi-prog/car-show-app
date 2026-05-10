import { cn } from "@/lib/utils";

/** Shared SaaS-style auth surfaces (login/signup only). */
export const authCardClass =
  "w-full max-w-[440px] rounded-2xl border border-border/60 bg-card/95 py-6 shadow-xl shadow-black/[0.06] ring-1 ring-black/[0.04] backdrop-blur-sm dark:border-border/50 dark:bg-card/90 dark:shadow-black/35 dark:ring-white/[0.06]";

export const authLogoWrapClass =
  "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15 transition-colors";

export const authInputClass =
  "h-10 min-h-10 rounded-xl border-border/80 bg-background text-base shadow-sm transition-[color,box-shadow,border-color] placeholder:text-muted-foreground/70 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-60 sm:h-11 sm:min-h-11 sm:text-[15px]";

export const authPrimaryButtonClass =
  "h-11 min-h-11 gap-2 text-base font-semibold shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 active:translate-y-px disabled:shadow-none";

export const authSectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

export function authAlertError(className?: string) {
  return cn(
    "flex gap-3 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm leading-snug text-destructive [&_svg]:mt-0.5 [&_svg]:size-[18px] [&_svg]:shrink-0",
    className
  );
}

export function authAlertSuccess(className?: string) {
  return cn(
    "flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.09] px-4 py-3 text-sm leading-snug text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300 [&_svg]:mt-0.5 [&_svg]:size-[18px] [&_svg]:shrink-0",
    className
  );
}
