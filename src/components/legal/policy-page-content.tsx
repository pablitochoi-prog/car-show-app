import { sanitizePolicyHtml } from "@/lib/sanitize-policy-html";
import { cn } from "@/lib/utils";

type PolicyPageContentProps = {
  html: string;
  className?: string;
};

export function PolicyPageContent({ html, className }: PolicyPageContentProps) {
  const safeHtml = sanitizePolicyHtml(html);

  return (
    <div
      className={cn("policy-content text-base leading-relaxed text-foreground", className)}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}

export const POLICY_UNPUBLISHED_MESSAGE =
  "This policy has not been published yet.";
