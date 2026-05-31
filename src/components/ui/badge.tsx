import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/12 text-primary [a]:hover:bg-primary/18",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border bg-background text-foreground",
        muted:
          "border-transparent bg-muted text-muted-foreground",
        success:
          "border-transparent bg-emerald-500/12 text-emerald-800 dark:text-emerald-300",
        warning:
          "border-transparent bg-amber-500/15 text-amber-900 dark:text-amber-200",
        danger:
          "border-transparent bg-destructive/12 text-destructive",
        incomplete:
          "border-transparent bg-pink-500/15 text-pink-900 dark:text-pink-200",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
