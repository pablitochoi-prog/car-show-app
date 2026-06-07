import { sanitizePolicyHtml } from "@/lib/sanitize-policy-html";
import { looksLikeHtml } from "@/lib/help/knowledge-article-rich-text";

type Props = {
  html: string;
  className?: string;
};

/** Renders sanitized rich HTML or plain text for help article fields. */
export function HelpRichTextContent({ html, className = "" }: Props) {
  const trimmed = html.trim();
  if (!trimmed) return null;

  if (looksLikeHtml(trimmed)) {
    const safe = sanitizePolicyHtml(trimmed);
    if (!safe) return null;
    return (
      <div
        className={`policy-content text-muted-foreground ${className}`.trim()}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    );
  }

  return <p className={`text-muted-foreground ${className}`.trim()}>{trimmed}</p>;
}
