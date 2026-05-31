import { isPolicyHtmlEmpty, sanitizePolicyHtml } from "@/lib/sanitize-policy-html";

/** Convert stored plain text or HTML into editor-friendly HTML. */
export function listingDescriptionToEditorHtml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed;
  }

  const escaped = trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\n/g, "<br>")}</p>`;
}

/** Sanitize listing description HTML before persistence or public render. */
export function sanitizeListingDescriptionHtml(html: string): string | null {
  const sanitized = sanitizePolicyHtml(html);
  if (isPolicyHtmlEmpty(sanitized)) return null;
  return sanitized;
}

/** Sanitize buyer inquiry message HTML (same allowed formatting as listings). */
export const sanitizeInquiryMessageHtml = sanitizeListingDescriptionHtml;

/** Plain text for emails and notifications. */
export function richTextToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
