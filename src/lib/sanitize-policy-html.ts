import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "a",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "span",
  "div",
];

const allowedAttributes: Record<string, string[]> = {
  a: ["href", "target", "rel", "style"],
  p: ["style"],
  span: ["style"],
  div: ["style"],
  h2: ["style"],
  h3: ["style"],
  li: ["style"],
};

/**
 * Sanitize admin-authored policy HTML for safe public rendering.
 * Strips scripts, event handlers, and unsafe URLs while keeping basic formatting.
 */
export function sanitizePolicyHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "";

  return sanitizeHtml(trimmed, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes,
    allowedSchemes: ["http", "https", "mailto"],
    allowedStyles: {
      "*": {
        color: [
          /^#[0-9a-f]{3,8}$/i,
          /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i,
        ],
        "font-size": [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/],
        "font-weight": [/^\d{3}$/, /^bold$/, /^normal$/],
        "font-style": [/^(?:italic|normal)$/],
        "text-decoration": [/^(?:underline|none)$/],
      },
    },
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href;
        return {
          tagName,
          attribs: {
            ...(href ? { href } : {}),
            rel: "noopener noreferrer",
            ...(attribs.target === "_blank" ? { target: "_blank" } : {}),
          },
        };
      },
    },
  }).trim();
}

export function isPolicyHtmlEmpty(html: string | null | undefined): boolean {
  if (html == null) return true;
  const stripped = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .trim();
  return stripped.length === 0;
}
