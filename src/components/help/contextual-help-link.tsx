"use client";

import Link from "next/link";
import { getHelpArticleBySlug } from "@/lib/help/help-file-registry";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  className?: string;
};

export function resolveContextualHelpLink(
  slug: string,
): { title: string; href: string } | null {
  const article = getHelpArticleBySlug(slug);
  if (!article) return null;
  return {
    title: article.title,
    href: `/help/${article.slug}`,
  };
}

export function ContextualHelpLink({ slug, className }: Props) {
  const resolved = resolveContextualHelpLink(slug);
  if (!resolved) return null;

  return (
    <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
      Need help? Read:{" "}
      <Link
        href={resolved.href}
        className="text-foreground underline-offset-4 hover:underline"
      >
        {resolved.title}
      </Link>
    </p>
  );
}
